from typing import Annotated, List, Union, Literal, Optional, Dict, Any
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
import json
import os
import re
from loguru import logger

from .support_agent import support_agent
from .rag_agent import rag_agent
from .ticket_agent import ticket_agent
from .analyze_agent import analyze_agent
from .iot_analyzer_agent import iot_analyzer_agent
from .knowledge_agent import knowledge_agent

from langgraph.checkpoint.memory import MemorySaver

from .models import SupportResponse, AgentDeps, TicketResponse
from .utils import parse_agent_output
from langchain_core.runnables import RunnableConfig
from ..services.event_bus import emit_event
from ..services.energy import energy_service

class State(TypedDict):
    messages: Annotated[List[Union[tuple, any]], add_messages]
    next_node: str
    recent_ticket_id: Optional[str]
    short_description: Optional[str]
    confirmation_asked: bool
    user_name: Optional[str]
    customer_email: Optional[str]
    priority: Optional[str]
    description: Optional[str]
    occurrence_time: Optional[str]
    is_approved: bool
    intent: Optional[str]
    extracted_details: Dict[str, Any] 
    category: Optional[str]
    current_date: Optional[str]
    knowledge_consulted: bool
    knowledge_advice: Optional[str]
    iot_consulted: Optional[bool] = False
    iot_advice: Optional[str] = None
    summary_shown: bool
    location: Optional[str]
    mobile_phone: Optional[str]
    address: Optional[str]


async def customer_support_node(state: State, config: RunnableConfig):
    """
    Triage & Routing: Analyzes intent and routes to workers.
    """
    thread_id = config["configurable"].get("thread_id", "default")
    user_id = config["configurable"].get("user_id")
    
    user_email = None
    user_name = None
    user_phone = None
    user_address = None
    if user_id:
        from ..core.database import SessionLocal, User
        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user_email = user.email
            user_name = user.name or user.email.split('@')[0]
            user_phone = user.mobile_phone
            user_address = user.address
        db.close()
        
    workflow_id = config["configurable"].get("workflow_id")
    from datetime import datetime
    current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    deps = AgentDeps(
        thread_id=thread_id, 
        user_id=user_id, 
        user_name=user_name,
        user_email=user_email,
        user_phone=user_phone,
        user_address=user_address,
        workflow_id=workflow_id,
        current_date=current_date
    )

    
    messages = state['messages']
    last_msg = messages[-1]
    
    is_first_turn = len(messages) <= 1
    if is_first_turn:
        logger.info("[SUPERVISOR] First turn detected - enforcing problem focus")
    
    await emit_event(thread_id, "agent_active", {"agent": "support", "status": "processing", "message": "Supervisor: Analyzing intent & delegating..."})
    
    context = ""
    for msg in messages[:-1]:
        role, content = msg if isinstance(msg, tuple) else (msg.type, msg.content)
        context += f"{role}: {content}\n"
    
    prompt = last_msg[1] if isinstance(last_msg, tuple) else getattr(last_msg, 'content', str(last_msg))
    
    if is_first_turn:
        full_prompt = f"SYSTEM: This is the very first message. Focus ONLY on understanding the user's problem. Do not ask for personal/account info yet.\n\nUser: {prompt}"
    else:
        full_prompt = f"Conversation History:\n{context}\n\nUser: {prompt}"
    
    logger.info(f"[SUPERVISOR] User context - Name: {user_name}, Email: {user_email}, Phone: {user_phone}, Address: {user_address}")
    
    try:
        res = await support_agent.run(full_prompt, deps=deps)
        output_model = res.output
    except Exception as e:
        print(f"Supervisor Reasoning Error: {e}")
        return {"messages": [("ai", f"Error in supervisor: {e}")], "next_node": "end"}

    response = output_model.response
    intent_lower = output_model.intent.lower()
    
    sentences = re.split(r'(?<=[.!?]) +', response)
    
    has_question = False
    filtered_sentences = []
    for s in sentences:
        if '?' in s:
            if not has_question:
                filtered_sentences.append(s)
                has_question = True
        else:
            filtered_sentences.append(s)
    
    limit = 10 if intent_lower in ["out_of_scope", "technical"] else 5
    response = ' '.join(filtered_sentences[:limit])

    print(f"  > Intent Detected: {output_model.intent}")
    print(f"  > Reasoning: {output_model.reasoning}")

    
    final_email = user_email if user_email else output_model.extracted_email
    
    confirmation_asked = state.get("confirmation_asked", False)
    knowledge_consulted = state.get("knowledge_consulted", False)
    
  
    current_intent = output_model.intent
    final_intent = intent_lower  
    
    user_prompt_lower = prompt.lower()
    if any(bye in user_prompt_lower for bye in ["bye", "goodbye", "thanks", "thank you", "thank", "that's all", "nothing else"]):
        logger.info("[SUPERVISOR] Goodbye detected - setting intent to end")
        final_intent = "end"

    all_details_given = output_model.all_details_given
    summary_shown = state.get("summary_shown", False)
    
    if all_details_given and not summary_shown and not knowledge_consulted:
        logger.info("[SUPERVISOR] All details gathered - Showing summary to user")
        final_intent = "chat"
    elif summary_shown and not knowledge_consulted:
        user_msg = prompt.lower()
        if any(word in user_msg for word in ["yes", "ok", "correct", "right", "confirm", "good"]) and final_intent not in ["lookup", "out_of_scope", "technical", "analyze_agent"]:
            logger.info("[SUPERVISOR] Summary confirmed - Intercepting to RAG")
            final_intent = "escalate"
        elif final_intent in ["chat", "escalate"]:
            logger.info("[SUPERVISOR] User may be correcting details - keeping as chat")
            final_intent = "chat"
    elif state.get("recent_ticket_id") and final_intent != "lookup":
        if any(word in user_prompt_lower for word in ["no", "thanks", "thank", "bye", "goodbye", "that is all", "nothing"]):
            logger.info("[SUPERVISOR] Post-ticket termination detected")
            final_intent = "end"
    elif confirmation_asked and knowledge_consulted:
        user_msg = prompt.lower()
        if any(word in user_msg for word in ["yes", "ok", "proceed", "go ahead", "do it", "create", "please", "go"]) and final_intent != "lookup":
            logger.info("[SUPERVISOR] User confirmed - Forcing escalation to Ticket")
            final_intent = "escalate"
        elif final_intent != "lookup":
            logger.info("[SUPERVISOR] User declined or unclear - keeping as chat")
            
    elif current_intent == "escalate" and not knowledge_consulted:
        logger.info("[SUPERVISOR] Escalation intent detected - Intercepting to RAG")
        final_intent = "escalate"
    
    existing_details = state.get("extracted_details", {})
    new_extracted_details = existing_details.copy()
    

    if output_model.all_details_given:
        new_extracted_details["all_details_given"] = True
    elif existing_details.get("all_details_given"):
        new_extracted_details["all_details_given"] = True
    else:
        new_extracted_details["all_details_given"] = False

    detail_map = {
        "extracted_email": final_email,
        "extracted_priority": output_model.extracted_priority,
        "extracted_description": output_model.extracted_description,
        "extracted_occurrence": output_model.extracted_occurrence,
        "extracted_details": output_model.extracted_details,
        "extracted_availability": output_model.extracted_availability,
        "extracted_contact_preference": output_model.extracted_contact_preference,
        "extracted_location": output_model.extracted_location,
        "extracted_category": output_model.extracted_category,
        "extracted_short_description": output_model.extracted_short_description
    }
    
    for key, val in detail_map.items():
        if val:
            new_extracted_details[key] = val

    new_state = {
        "intent": final_intent,
        "user_name": user_name,
        "current_date": current_date,
        "extracted_details": new_extracted_details,
        "recent_ticket_id": None if not summary_shown else state.get("recent_ticket_id")
    }

    
    should_skip_message = (confirmation_asked and knowledge_consulted and final_intent == "escalate")
    if not should_skip_message:
        new_state["messages"] = [("ai", response)]
    else:
        logger.info("[SUPERVISOR] Skipping acknowledgment message - proceeding directly to ticket creation")
    
    if confirmation_asked:
        new_state["confirmation_asked"] = True
    
    if all_details_given and not summary_shown:
        new_state["summary_shown"] = True
    elif summary_shown:
        new_state["summary_shown"] = True 
    
    if knowledge_consulted: new_state["knowledge_consulted"] = True
    
    if final_email: new_state["customer_email"] = final_email
    if user_phone: new_state["mobile_phone"] = user_phone
    if user_address: new_state["address"] = user_address
    
    if output_model.extracted_priority: new_state["priority"] = output_model.extracted_priority
    if output_model.extracted_description: new_state["description"] = output_model.extracted_description
    if output_model.extracted_occurrence: new_state["occurrence_time"] = output_model.extracted_occurrence
    if output_model.extracted_location: new_state["location"] = output_model.extracted_location
    if output_model.extracted_category: new_state["category"] = output_model.extracted_category
    if output_model.extracted_short_description: new_state["short_description"] = output_model.extracted_short_description
    
    return new_state


async def knowledge_node(state: State, config: RunnableConfig):
    thread_id = config["configurable"].get("thread_id", "default")
    await emit_event(thread_id, "agent_active", {"agent": "knowledge base", "status": "processing", "message": "Worker: Reviewing incident context..."})
    
    messages = state['messages']
    prompt = "Help"
    for msg in reversed(messages):
        msg_role = msg[0] if isinstance(msg, tuple) else getattr(msg, 'type', '')
        if msg_role == 'human':
             prompt = msg[1] if isinstance(msg, tuple) else getattr(msg, 'content', '')
             break

    user_id = config["configurable"].get("user_id")
    user_email = None
    if user_id:
        from ..core.database import SessionLocal, User
        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()
        if user: user_email = user.email
        db.close()

    workflow_id = config["configurable"].get("workflow_id")
    from datetime import datetime
    current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    deps = AgentDeps(thread_id=thread_id, user_id=user_id, user_email=user_email, workflow_id=workflow_id, current_date=current_date)

    intent = state.get("intent")
    
    if intent == "out_of_scope":
        last_user_msg = ""
        for msg in reversed(state.get('messages', [])):
            role, content = msg if isinstance(msg, tuple) else (msg.type, msg.content)
            if role == "human":
                last_user_msg = str(content)
                break
        search_query = last_user_msg
        logger.info(f"[RAG NODE] informational query: {search_query}")
    else:
        issue_desc = state.get("description") or prompt
        location = state.get("location") or state.get("customer_location")
        
        if location and any(word in issue_desc.lower() for word in ["outage", "blackout", "no power", "power cut", "electricity down", "panne"]):
            if any(word in issue_desc.lower() for word in ["electricity", "power", "outage", "blackout", "no power"]):
                search_query = f"power outage electricity outage weather issues in {location}"
            elif any(word in issue_desc.lower() for word in ["gas", "leak"]):
                search_query = f"gas outage gas issues in {location}"
            elif any(word in issue_desc.lower() for word in ["solar", "inverter", "panel"]):
                search_query = f"solar power issues inverter problems in {location}"
            else:
                search_query = f"{issue_desc} in {location}"
            logger.info(f"[RAG NODE] location-based search: {search_query}")
        else:
            search_query = issue_desc
            logger.info(f"[RAG NODE] search query: {search_query}")


    try:
        res = await rag_agent.run(search_query, deps=deps)
        response_text = str(res.output)
        
        sentences = re.split(r'(?<=[.!?]) +', response_text)
        response_text = ' '.join(sentences[:3])
        
    except Exception as e:
        logger.error(f"RAG Node Error: {e}")
        response_text = "ERROR_RETRIEVING_INFO"

    intent = state.get("intent")
    
    first_user_msg = ""
    for msg in state.get('messages', []):
        role, content = msg if isinstance(msg, tuple) else (msg.type, msg.content)
        if role == "human":
            first_user_msg = str(content).lower()
            break
            
    is_french = any(word in first_user_msg for word in ["oui", "bonjour", "merci", "problème", "courant", "panne", "électricité", "j'ai"])
    is_arabic = any(char in first_user_msg for char in ["،", "؟", "أ", "ب", "ت", "ث"])
    
    if intent == "escalate":
        has_useful_info = response_text and len(response_text) > 20 and "NO_SPECIFIC_INFO_FOUND" not in response_text and "ERROR_RETRIEVING_INFO" not in response_text
        
        if is_french:
            advice_msg = "Dois-je procéder à la création du ticket pour vous ?"
        elif is_arabic:
            advice_msg = "هل أقوم بإنشاء التذكرة لك؟"
        else:
            advice_msg = "Shall I proceed with creating the ticket for you?"
        
        return {
            "messages": [("ai", advice_msg)],
            "knowledge_consulted": True,
            "knowledge_advice": response_text if response_text else "No specific guidance available",
            "confirmation_asked": True
        }

    if "NO_SPECIFIC_INFO_FOUND" in response_text or "ERROR_RETRIEVING_INFO" in response_text:
        if is_french:
            response_text = "Je suis désolé, je n'ai pas trouvé d'informations spécifiques sur ce sujet dans ma base de connaissances. Je peux vous aider avec les compteurs d'énergie, la facturation et le support technique. Souhaitez-vous que j'ouvre un ticket pour vous ?"
        else:
            response_text = "I'm sorry, I couldn't find specific information on that topic in my knowledge base. I can assist with energy meters, billing, and technical support. Would you like me to open a ticket for you?"

    return {
        "messages": [("ai", response_text)],
        "knowledge_consulted": True
    }


async def ticket_agent_node(state: State, config: RunnableConfig):
    thread_id = config["configurable"].get("thread_id", "default")
    intent = state.get("intent")
    
    if intent == "lookup":
        await emit_event(thread_id, "agent_active", {"agent": "ticket_agent", "status": "processing", "message": "Worker: Fetching your tickets..."})
    else:
        await emit_event(thread_id, "agent_active", {"agent": "ticket_agent", "status": "processing", "message": "Worker: Initiating ticket creation..."})
    
    workflow_id = config["configurable"].get("workflow_id")
    
    user_id = config["configurable"].get("user_id")
    user_email = None
    user_name = None
    user_phone = None
    user_address = None
    if user_id:
        from ..core.database import SessionLocal, User
        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user_email = user.email
            user_name = user.name or user_email.split('@')[0]
            user_phone = user.mobile_phone
            user_address = user.address
        db.close()

    from datetime import datetime
    current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    deps = AgentDeps(
        thread_id=thread_id, 
        user_id=user_id, 
        user_email=user_email, 
        user_name=user_name,
        user_phone=user_phone,
        user_address=user_address,
        workflow_id=workflow_id,
        current_date=current_date
    )
    
    try:
        messages = state.get('messages', [])
        history = []
        for msg in messages[-10:]:
            role, content = msg if isinstance(msg, tuple) else (msg.type, msg.content)
            history.append({"role": role, "content": str(content)})

        if intent == "lookup":
            prompt = "Show my tickets"
            for msg in reversed(messages):
                msg_role = msg[0] if isinstance(msg, tuple) else getattr(msg, 'type', '')
                if msg_role == 'human':
                     prompt = msg[1] if isinstance(msg, tuple) else getattr(msg, 'content', '')
                     break
            ticket_prompt = prompt
        else:
            email = state.get("customer_email") or user_email
            priority = state.get("priority")
            desc = state.get("description")
            short_desc = state.get("short_description") or (desc[:77] + "..." if desc else "Support Request")
            location = state.get("location", "Not specified")

            category = state.get("category", "inquiry")
            occ = state.get("occurrence_time", "Not specified")
            ext_details = state.get("extracted_details", {})
            availability = ext_details.get("extracted_availability", "Not specified")
            contact_pref = ext_details.get("extracted_contact_preference", "Email")
            
            ticket_prompt = f"""ACTION: Create ticket now.
                DATA: {json.dumps({
                    "email": email,
                    "priority": priority,
                    "category": category,
                    "location": location,
                    "short_description": short_desc,
                    "description": desc,
                    "occurrence": occ,
                    "availability": availability,
                    "contact_method": contact_pref
                })}
                HISTORY CONTEXT: {json.dumps(history[-5:])}
                """




        res = await ticket_agent.run(ticket_prompt, deps=deps)
        output_model = res.output
        
        logger.info(f"[TICKET NODE] Agent Output Model: {output_model}")
        
        if intent == "lookup":
            response_msg = output_model.lookup_summary if output_model.lookup_summary else "I couldn't find any tickets."
            return {
                "messages": [("ai", response_msg)]
            }

        incident_id = output_model.incident_id or output_model.servicenow_id
        
        if not incident_id:
            logger.warning("[TICKET NODE] incident_id missing from output model, scanning history...")
            for msg in reversed(res.new_messages()):
                if hasattr(msg, 'content') and "INC" in str(msg.content):
                    match = re.search(r"INC\d+", str(msg.content))
                    if match:
                        incident_id = match.group(0)
                        logger.info(f"[TICKET NODE] Recovered incident_id from message history: {incident_id}")
                        break
        
        if not incident_id or incident_id == "UNKNOWN":
            agent_msgs = [m.content for m in res.new_messages() if hasattr(m, 'content')]
            error_hint = " ".join(agent_msgs) if agent_msgs else "Agent failed to call tool or return ID"
            logger.error(f"[TICKET NODE] Failed to determine incident_id. Hint: {error_hint}")
            return {
                "messages": [("ai", f"⚠️ I'm sorry, I was able to gather your details but encountered an issue with the ticket system: {error_hint[:200]}")],
                "recent_ticket_id": None
            }

        servicenow_id = output_model.servicenow_id if output_model.servicenow_id else incident_id

        ticket_status = output_model.status if output_model.status else "submitted"

        await emit_event(thread_id, "tool_call", {
            "tool": "ticket_creation",
            "status": "completed",
            "output": {"incident_id": incident_id, "servicenow_id": servicenow_id}
        })
        
        response_msg = f"Ticket **{incident_id}** has been created successfully!\n"
        if servicenow_id and servicenow_id != "N/A" and servicenow_id != "UNKNOWN":
            response_msg += f"🔗 ServiceNow ID: {servicenow_id}\n"
            
        response_msg += "\nI have successfully created the ticket for you. Do you need anything else?"

        return {
            "messages": [("ai", response_msg)],
            "recent_ticket_id": incident_id,
            "confirmation_asked": False,
            "knowledge_consulted": False,
            "summary_shown": False,
            "intent": "chat"
        }
    except Exception as e:
        print(f"[TICKET NODE] ERROR: {e}")
        return {
            "messages": [("ai", f"Error creating ticket: {str(e)}")]
        }

async def analyze_agent_node(state: State, config: RunnableConfig):
    thread_id = config["configurable"].get("thread_id", "default")
    await emit_event(thread_id, "agent_active", {"agent": "analyze_agent", "status": "processing", "message": "Worker: Running neural diagnostics..."})
    
    user_id = config["configurable"].get("user_id")
    user_email = None
    if user_id:
        from ..core.database import SessionLocal, User
        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()
        if user: user_email = user.email
        db.close()

    workflow_id = config["configurable"].get("workflow_id")
    from datetime import datetime
    current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    deps = AgentDeps(thread_id=thread_id, user_id=user_id, user_email=user_email, workflow_id=workflow_id, current_date=current_date)

    ticket_id = state.get("recent_ticket_id")
    logger.info(f"Analyze Node triggered for ticket_id: {ticket_id}")
    if not ticket_id:
        logger.warning("No ticket_id found in state for analysis")
        return {"messages": [("ai", "No ticket found to analyze.")]}
    
    try:
        from ..services.servicenow_service import servicenow_service
        incident = await servicenow_service.get_incident(ticket_id)
        if incident:
            ticket_desc = incident.get('description', state.get("description", "Unknown issue"))
            logger.info(f"Retrieved incident description from ServiceNow for {ticket_id}")
        else:
            ticket_desc = state.get("description", "Unknown issue")
            logger.warning(f"Could not fetch incident {ticket_id} from ServiceNow, using state description")
    except Exception as e:
        logger.error(f"Error fetching incident from ServiceNow: {e}")
        ticket_desc = state.get("description", "Unknown issue")
    
    knowledge_advice = state.get("knowledge_advice", "No specific guidance available")
    address = state.get("address", "Unknown location")
    
    prompt = f"""
    Analyze ticket {ticket_id}. 
    Issue: {ticket_desc}
    User Address: {address}
    Technical/Regional Context: {knowledge_advice}
    
    INSTRUCTIONS:
    1. If this is a power outage or solar issue, use `web_search_tool` to check the current weather and any reported regional outages in {address}.
    2. If the issue is NOT related to energy/utilities (e.g. IT/PC problems), state it is out of scope.
    3. Include findings about weather/location in your report.
    """
    logger.info(f"Running AI analysis for {ticket_id} with RAG context...")
    res = await analyze_agent.run(prompt, deps=deps)
    report = str(res.output)
    logger.info(f"AI analysis report generated for {ticket_id} (Length: {len(report)})")

    try:
        from ..services.servicenow_service import servicenow_service
        note_text = f" NEURAL DIAGNOSTIC REPORT:\n\n{report}"
        await servicenow_service.add_incident_note(ticket_id, note_text, is_work_note=True)
        
        update_data = {
            "u_ai_analysis": report,
            "state": "2" 
        }
        await servicenow_service.update_incident(ticket_id, update_data)
        
        logger.info(f"AI Analysis successfully synced and state updated to 2 for {ticket_id}")
    except Exception as e:
        logger.error(f"Failed to post AI analysis to ServiceNow for {ticket_id}: {e}")

    return {
        "messages": [] 
    }

async def iot_agent_node(state: State, config: RunnableConfig):
    """
    IoT Agent: Industrial systems diagnostic.
    """
    thread_id = config["configurable"].get("thread_id", "default")
    await emit_event(thread_id, "agent_active", {"agent": "iot_agent", "status": "processing", "message": "Neural Worker: Analyzing IoT signals..."})
    
    user_id = config["configurable"].get("user_id")
    user_email = state.get("customer_email")
    if not user_email and user_id:
        from ..core.database import SessionLocal, User
        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()
        if user: user_email = user.email
        db.close()

    workflow_id = config["configurable"].get("workflow_id")
    from datetime import datetime
    current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    deps = AgentDeps(thread_id=thread_id, user_id=user_id, user_email=user_email, workflow_id=workflow_id, current_date=current_date)

    last_msg = state['messages'][-1]
    prompt = last_msg[1] if isinstance(last_msg, tuple) else getattr(last_msg, 'content', str(last_msg))

    logger.info(f"IoT Node triggered with input: {prompt[:50]}...")
    res = await iot_analyzer_agent.run(prompt, deps=deps)
    analysis = res.output

    logger.info(f"IoT Analysis Complete: {analysis.priority} priority - {analysis.incident_subject}")
    
    from langchain_core.messages import AIMessage
    response_msg = f"IoT Diagnostic: {analysis.reasoning}\n\n"
    if analysis.ticket_id:
        response_msg += f"✅ Critical incident ticket created: {analysis.ticket_id} (Status: {analysis.ticket_status})"
    else:
        response_msg += f"ℹ️ Priority {analysis.priority} recorded. No ticket required at this level."

    return {
        "iot_advice": analysis.reasoning,
        "iot_consulted": True,
        "recent_ticket_id": analysis.ticket_id or state.get("recent_ticket_id"),
        "messages": [AIMessage(content=response_msg)]
    }

async def public_knowledge_node(state: State, config: RunnableConfig):
    """
    Node for the public-facing Knowledge Agent.
    """
    thread_id = config["configurable"].get("thread_id", "default")
    await emit_event(thread_id, "agent_active", {"agent": "public_knowledge", "status": "processing", "message": "Retrieving information..."})
    
    messages = state['messages']
    last_msg = messages[-1]
    prompt = last_msg[1] if isinstance(last_msg, tuple) else getattr(last_msg, 'content', str(last_msg))
    
    context = ""
    if len(messages) > 1:
        logger.info(f"[PUBLIC NODE] Building conversation history from {len(messages)-1} previous messages")
        for i, msg in enumerate(messages[:-1], 1):
            role, content = msg if isinstance(msg, tuple) else (msg.type, msg.content)
            if role == "human": role = "User"
            elif role == "ai": role = "Assistant"
            elif role == "model": role = "Assistant"
            context += f"Message {i} - {role}: {content}\n"
        logger.info(f"[PUBLIC NODE] Conversation history built: {len(context)} characters")
    else:
        logger.info("[PUBLIC NODE] First message in conversation - no history")
    
    full_prompt = prompt
    if context:
        full_prompt = f"""Conversation History (use this to maintain context and answer questions about previous messages):
{context}

Current User Query: {prompt}

IMPORTANT: If the user is asking about previous messages or using pronouns that refer to earlier context, use the Conversation History above to provide an accurate answer. If this is a new question, refine your search query based on the conversation history if relevant."""
        logger.info(f"[PUBLIC NODE] Full prompt with history: {len(full_prompt)} characters")
    else:
        logger.info(f"[PUBLIC NODE] No history - using direct prompt: {prompt}")
    
    from datetime import datetime
    current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    deps = AgentDeps(thread_id=thread_id, user_id="guest", user_email="guest@example.com", workflow_id="public", current_date=current_date)
    
    try:
        res = await knowledge_agent.run(full_prompt, deps=deps)
        response_text = res.output
        logger.info(f"[PUBLIC NODE] Knowledge agent response: {len(str(response_text))} characters")
    except Exception as e:
        print(f"Knowledge Agent Error: {e}")
        logger.error(f"[PUBLIC NODE] Knowledge agent error: {e}")
        response_text = "I apologize, but I'm having trouble retrieving information right now."
        
    intent = "chat"
    user_prompt_lower = prompt.lower()
    if any(bye in user_prompt_lower for bye in ["bye", "goodbye", "thanks", "thank you", "thank", "that's all", "nothing else"]):
        logger.info("[PUBLIC NODE] Goodbye detected - setting intent to end")
        intent = "end"

    return {
        "messages": [("ai", response_text)],
        "intent": intent
    }

def router_edge(state: State):
    intent = state.get("intent", "chat")
    details = state.get("extracted_details", {})
    recent_ticket_id = state.get("recent_ticket_id")
    
    logger.info(f"[ROUTER] Intent: {intent}, Recent Ticket: {recent_ticket_id}")
    
    if recent_ticket_id and intent == "chat":
        return END
    
    if intent == "end":
        return END
    
    if intent == "chat":
        return END

    if intent == "out_of_scope":
        return "knowledge_agent"
    
    if intent == "system_health":
        return "knowledge_agent"
        
    if intent == "escalate":
        consulted = state.get("knowledge_consulted", False)
        
        if not consulted:
            return "knowledge_agent"
            
        return "ticket_agent"
        
    if intent == "technical":
        return "knowledge_agent"
        
    if intent == "analyze":
        if recent_ticket_id:
            return "analyze_agent"
        else:
            return END
            
    if intent == "lookup":
        return "ticket_agent"
            
    return END

builder = StateGraph(State)

builder.add_node("customer_support", customer_support_node)
builder.add_node("knowledge_agent", knowledge_node)
builder.add_node("ticket_agent", ticket_agent_node)
builder.add_node('analyze_agent', analyze_agent_node)
builder.add_node('iot_agent', iot_agent_node)

builder.add_edge(START, "customer_support")

builder.add_conditional_edges(
    "customer_support",
    router_edge,
    {
        "ticket_agent": "ticket_agent",
        "knowledge_agent": "knowledge_agent",
        "analyze_agent": "analyze_agent",
        "iot_agent": "iot_agent",
        END: END
    }
)

def ticket_router(state: State):
    """
    Decide whether to go to analyze or end after ticket node.
    """
    if state.get("recent_ticket_id"):
        return "analyze_agent"
    return END

builder.add_conditional_edges(
    "ticket_agent",
    ticket_router,
    {
        "analyze_agent": "analyze_agent",
        "iot_agent": "iot_agent",
        END: END
    }
)

builder.add_edge("knowledge_agent", END)

builder.add_edge('analyze_agent', END)
builder.add_edge('iot_agent', END)

agent_app = builder.compile(checkpointer=MemorySaver())

public_builder = StateGraph(State)
public_builder.add_node("public_knowledge", public_knowledge_node)
public_builder.add_edge(START, "public_knowledge")
public_builder.add_edge("public_knowledge", END)

public_agent_app = public_builder.compile(checkpointer=MemorySaver())
