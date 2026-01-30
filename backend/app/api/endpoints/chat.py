from fastapi import APIRouter, Depends, HTTPException, WebSocket, Header, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import asyncio
import time
import uuid
import traceback
from loguru import logger

from ...core import auth
from ...core.database import User, ChatSession, SystemLog, get_db
from ...schemas.chat import ChatRequest, ChatResponse
from ...agents.graph import agent_app
from ...agents import support_agent, rag_agent, ticket_agent, analyze_agent, iot_analyzer_agent
from ...agents.models import AgentDeps
from ...services.event_bus import get_event_generator, event_queues
from ...services.guardrails import guardrail_service

router = APIRouter()

@router.get("/stream/{thread_id}", tags=["chat"])
async def chat_stream(thread_id: str):
    if thread_id not in event_queues:
        event_queues[thread_id] = asyncio.Queue()
        
    return StreamingResponse(
        get_event_generator(thread_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/", response_model=ChatResponse, tags=["chat"])
async def chat(request: ChatRequest, db: Session = Depends(get_db), authorization: Optional[str] = Header(None)):
    start_time = time.time()
    try:
        # Extract token from "Bearer <token>" format
        token = None
        if authorization and authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
        
        current_user = await auth.get_current_user_optional(token, db)
        user_id = current_user.id if current_user else None
        
        logger.info(f"[CHAT ENDPOINT] Current user: {current_user.email if current_user else 'None'}, user_id: {user_id}")
        
        session = db.query(ChatSession).filter(ChatSession.id == request.thread_id).first()
        if not session and current_user:
            session = ChatSession(id=request.thread_id, user_id=current_user.id, title=request.message[:50])
            db.add(session)
            db.commit()
        elif session and not session.is_active:
             raise HTTPException(status_code=400, detail="This conversation has been finished.")

        workflow_id = request.workflow_id or (current_user.workflow_id if current_user else None)
        
        config = {
            "configurable": {
                "thread_id": request.thread_id, 
                "user_id": user_id,
                "workflow_id": workflow_id
            }
        }
        
        logger.info(f"[CHAT ENDPOINT] Config being passed to agent: thread_id={request.thread_id}, user_id={user_id}, workflow_id={workflow_id}")
        
        state_snapshot = await agent_app.aget_state(config)
        existing_values = state_snapshot.values if state_snapshot.values else {}
        
        input_data = {
            "messages": [("human", request.message)],
            "next_node": existing_values.get("next_node", "support"),
            "recent_ticket_id": existing_values.get("recent_ticket_id", ""),
            "customer_email": existing_values.get("customer_email", ""),
            "priority": existing_values.get("priority", ""),
            "description": existing_values.get("description", ""),
            "is_approved": existing_values.get("is_approved", False)
        }

        result = await agent_app.ainvoke(input_data, config=config)
        latency = int((time.time() - start_time) * 1000)

        last_message = result["messages"][-1]
        if isinstance(last_message, tuple):
            last_ai_message = last_message[1]
        else:
            last_ai_message = last_message.content if hasattr(last_message, 'content') else str(last_message)
        
        current_agent = "ticket_agent" if result.get("recent_ticket_id") else "support_agent"
        
        safe_input = guardrail_service.mask_pii_in_logs(request.message)
        safe_output = guardrail_service.mask_pii_in_logs(last_ai_message)

        log_entry = SystemLog(
            id=str(uuid.uuid4()),
            session_id=request.thread_id if session else None,
            agent_name=current_agent.replace("_", " ").title(),
            incident_id=result.get("recent_ticket_id"),
            status="Success",
            input_payload=safe_input,
            output_payload=safe_output,
            latency_ms=str(latency)
        )
        db.add(log_entry)
        db.commit()

        return ChatResponse(response=last_ai_message, agent=current_agent)
    except Exception as e:
        latency = int((time.time() - start_time) * 1000)
        db.add(SystemLog(
            id=str(uuid.uuid4()),
            agent_name="System",
            status="Failure",
            input_payload=request.message,
            error_message=str(e),
            latency_ms=str(latency)
        ))
        db.commit()
        db.commit()
        logger.error(f"Chat Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agent", response_model=ChatResponse, tags=["chat"])
async def chat_with_agent(request: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    """Chat directly with a single agent, bypassing the supervisor graph."""
    start_time = time.time()
    try:
        if not request.agent_id:
            raise HTTPException(status_code=400, detail="agent_id is required for direct agent chat.")

        agents_map = {
            "agent-support": support_agent,
            "agent-rag": rag_agent,
            "agent-ticket": ticket_agent,
            "agent-analyze": analyze_agent,
            "agent-iot": iot_analyzer_agent
        }
        
        role_map = {
            "Triage": support_agent,
            "ServiceNow": ticket_agent,
            "Knowledge": rag_agent,
            "Web Search": rag_agent, 
            "Analysis": analyze_agent,
            "IoT Analysis": iot_analyzer_agent
        }
        
        agent = agents_map.get(request.agent_id) or role_map.get(request.agent_id)
        
        if not agent:
            from ...core.database import AgentConfig
            config = db.query(AgentConfig).filter(AgentConfig.id == request.agent_id).first()
            if config:
                agent = role_map.get(config.role)
            
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent '{request.agent_id}' not found.")

        from datetime import datetime
        current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        deps = AgentDeps(
            thread_id=request.thread_id,
            user_id=current_user.id,
            workflow_id=request.workflow_id or current_user.workflow_id,
            current_date=current_date
        )

        res = await agent.run(request.message, deps=deps)
        output = res.output
        
        if hasattr(output, 'response'):
            last_ai_message = output.response
        elif hasattr(output, 'incident_id'):
            last_ai_message = f"✅ Ticket Created: {output.incident_id}\nStatus: {output.status}\nPriority: {output.priority}"
            if output.servicenow_id:
                last_ai_message += f"\n🔗 ServiceNow ID: {output.servicenow_id}"
        else:
            last_ai_message = str(output)
        
        latency = int((time.time() - start_time) * 1000)

        log_entry = SystemLog(
            id=str(uuid.uuid4()),
            session_id=request.thread_id,
            agent_name=request.agent_id,
            status="Success",
            input_payload=request.message,
            output_payload=last_ai_message,
            latency_ms=str(latency)
        )
        db.add(log_entry)
        db.commit()

        return ChatResponse(response=last_ai_message, agent=request.agent_id)
    except Exception as e:
        logger.error(f"Single Agent Chat Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{thread_id}", tags=["chat"])
async def get_history(thread_id: str):
    try:
        config = {"configurable": {"thread_id": thread_id}}
        state_snapshot = agent_app.get_state(config)
        if not state_snapshot.values or 'messages' not in state_snapshot.values:
             return {"messages": []}
             
        formatted_messages = []
        for msg in state_snapshot.values['messages']:
            role = "user" if msg.type == "human" else "bot"
            formatted_messages.append({
                "text": msg.content,
                "sender": role,
            })
            
        return {"messages": formatted_messages}
    except Exception as e:
        logger.error(f"History Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")

    finally:
        print("TEST: Disconnected", flush=True)

@router.websocket("/ws/voice")
async def websocket_voice_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Voice WebSocket connected (Pipecat)")
    try:
        pass 
    except Exception as e:
        logger.error(f"Error in Pipecat voice endpoint: {e}")
    finally:
        logger.info("Voice WebSocket connection closed")
