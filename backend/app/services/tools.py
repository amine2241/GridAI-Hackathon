from app.services.energy import energy_service
from typing import Dict, Any, List, Optional
from app.services.event_bus import emit_event
import requests
import os
import asyncio
import json
from loguru import logger
from pydantic_ai import RunContext
from app.services.servicenow_service import servicenow_service

from app.agents.models import AgentDeps
from app.core.database import SessionLocal, Ticket, SystemLog


_processed_ticket_requests = {}

def get_thread_id(ctx: RunContext[AgentDeps]) -> str:
    return ctx.deps.thread_id

def get_user_id(ctx: RunContext[AgentDeps]) -> Optional[str]:
    return ctx.deps.user_id

async def submit_ticket_tool(ctx: RunContext[AgentDeps], subject: str, description: str, priority: str, email: str, category: str = "inquiry", approved: bool = False, contact_type: str = "Virtual Agent") -> str:
    """Submit a support ticket directly to ServiceNow and return the incident ID."""
    thread_id = get_thread_id(ctx)
    
    request_key = f"{thread_id}:{subject}:{priority}"
    if request_key in _processed_ticket_requests:
        logger.warning(f"Duplicate ticket request detected for thread {thread_id}. Returning cached ID.")
        return _processed_ticket_requests[request_key]

    await emit_event(thread_id, "tool_call", {
        "tool": "submit_ticket",
        "status": "started",
        "input": {"subject": subject, "priority": priority, "email": email}
    })
    
    try:
        category_mapping = {
            "Electricity - Network & Supply": "electricity_outage",
            "Meters & Equipment": "hardware",
            "Gas - Supply & Safety": "supply_safety",
            "Billing & Consumption": "billing",
            "Inquiry": "inquiry"
        }
        
        internal_category = category_mapping.get(category, category)
        
        lower_priority = priority.lower()
        if lower_priority in ["critical", "high"]:
            impact = "high"
        elif lower_priority == "medium":
            impact = "medium"
        else:
            impact = "low"

        sn_res = await servicenow_service.create_incident(
            short_description=subject, 
            description=description, 
            impact=impact, 
            email=email, 
            caller_name=ctx.deps.user_name,
            category=internal_category,
            contact_type=contact_type
                )
        sn_id = sn_res.get("number") if sn_res else None
        
        if not sn_id:
            raise Exception("Failed to receive incident number from ServiceNow")

        await emit_event(thread_id, "tool_call", {
            "tool": "submit_ticket",
            "status": "completed",
            "output": {"servicenow_id": sn_id}
        })
        
        result = json.dumps({
            "incident_id": sn_id,
            "servicenow_id": sn_id,
            "status": "submitted",
            "approved": approved,
            "priority": priority,
            "email": email,
            "subject": subject
        })
        
        _processed_ticket_requests[request_key] = result
        return result
    except Exception as e:
        logger.error(f"Error creating ServiceNow ticket: {e}")
        await emit_event(thread_id, "tool_call", {
            "tool": "submit_ticket",
            "status": "failed",
            "output": {"error": str(e)}
        })
        return f"Error creating ticket in ServiceNow: {str(e)}"

async def get_my_tickets_tool(ctx: RunContext[AgentDeps]) -> str:
    """Get all tickets associated with the current user exclusively from ServiceNow."""
    thread_id = get_thread_id(ctx)
    user_email = ctx.deps.user_email
    
    if not user_email:
        return "You must be logged in with a valid email to view your ServiceNow tickets."
        
    await emit_event(thread_id, "tool_call", {
        "tool": "get_my_tickets", 
        "status": "started"
    })
    
    try:
        sn_tickets = await servicenow_service.get_user_incidents(user_email)
        
        result = "### 📋 Your ServiceNow Incidents\n"
        
        state_map = {
            "1": "New",
            "2": "In Progress (AI Analyzed)",
            "3": "On Hold",
            "6": "Resolved",
            "7": "Closed",
            "8": "Canceled"
        }
        
        if sn_tickets:
            for st in sn_tickets:
                state_code = str(st.get('state', '1'))
                state_label = state_map.get(state_code, f"Unknown ({state_code})")
                result += f"- **{st.get('number')}**: {st.get('short_description')} ({state_label})\n"
        else:
            result += f"No incidents found in ServiceNow for email: {user_email}.\n"
            
        await emit_event(thread_id, "tool_call", {
            "tool": "get_my_tickets",
            "status": "completed",
            "output": {"count": len(sn_tickets)}
        })
        return result
    except Exception as e:
        logger.error(f"Failed to fetch ServiceNow tickets for {user_email}: {e}")
        return f"Error retrieving tickets from ServiceNow: {str(e)}"

async def search_kb_tool(ctx: RunContext[AgentDeps], query: str) -> str:
    thread_id = get_thread_id(ctx)
    await emit_event(thread_id, "tool_call", {
        "tool": "search_kb", 
        "status": "started",
        "input": {"query": query}
    })
    
    from app.services.rag_service import get_rag_service
    rs = get_rag_service()
    results = rs.search(query) if rs else []
    
    await emit_event(thread_id, "tool_call", {
        "tool": "search_kb",
        "status": "completed", 
        "output": {"count": len(results), "top_result": results[0].page_content[:50] if results else None}
    })
    
    if not results:
        return "No relevant troubleshooting guides found."
    
    return "\n---\n".join([doc.page_content for doc in results])

async def web_search_tool(ctx: RunContext[AgentDeps], query: str) -> str:
    thread_id = get_thread_id(ctx)
    await emit_event(thread_id, "tool_call", {
        "tool": "web_search",
        "status": "started", 
        "input": {"query": query}
    })
    
    try:
        from tavily import TavilyClient
        api_key = os.getenv("TAVILY_API_KEY")
        if not api_key:
            return "Error: TAVILY_API_KEY not found in environment variables."
            
        tavily = TavilyClient(api_key=api_key)
        response = tavily.search(query=query, search_depth="advanced")
        
        results = response.get("results", [])
        if not results:
            result_text = "No results found."
        else:
            result_text = "\n\n".join([f"Source: {r['url']}\nSummary: {r['content']}" for r in results[:3]])
            
        await emit_event(thread_id, "tool_call", {
            "tool": "web_search",
            "status": "completed",
            "output": {"summary": result_text[:100] + "..."}
        })
        
        return result_text
        
    except Exception as e:
        logger.error(f"Web Search Error: {e}")
        await emit_event(thread_id, "tool_call", {
            "tool": "web_search",
            "status": "failed",
            "error": str(e)
        })
        return f"Error executing web search: {str(e)}"



async def create_servicenow_incident_mcp(
    ctx: RunContext[AgentDeps], 
    short_description: str,
    description: str,
    impact: str = "medium",
    category: str = "inquiry",
    contact_type: str = "Virtual Agent"
) -> str:
    """Create incident in ServiceNow (In-Process)"""
    thread_id = get_thread_id(ctx)
    await emit_event(thread_id, "tool_call", {
        "tool": "servicenow_create_incident",
        "status": "started",
        "input": {"issue": short_description[:50] + "...", "impact": impact}
    })
    
    try:
        user_email = ctx.deps.user_email
        user_name = ctx.deps.user_name
        result = await servicenow_service.create_incident(
            short_description=short_description, 
            description=description, 
            impact=impact, 
            email=user_email, 
            caller_name=user_name,
            category=category,
            contact_type=contact_type
        )
        
        await emit_event(thread_id, "tool_call", {
            "tool": "servicenow_create_incident",
            "status": "completed",
            "output": {"incident_number": result.get("number")}
        })
        
        import json
        return json.dumps({
            "status": "success",
            "incident_number": result.get("number"),
            "sys_id": result.get("sys_id"),
            "priority": result.get("priority"),
            "short_description": result.get("short_description")
        })
        
    except Exception as e:
        await emit_event(thread_id, "tool_call", {
            "tool": "servicenow_create_incident", 
            "status": "failed", 
            "error": str(e)
        })
        return f'{{"error": "Failed to create ServiceNow incident: {str(e)}"}}'

async def get_servicenow_incident_mcp(ctx: RunContext[AgentDeps], incident_number: str) -> str:
    """Get incident details from ServiceNow (In-Process)"""
    thread_id = get_thread_id(ctx)
    await emit_event(thread_id, "tool_call", {
        "tool": "servicenow_get_incident",
        "status": "started",
        "input": {"incident_number": incident_number}
    })
    
    try:
        result = await servicenow_service.get_incident(incident_number)
        
        if result:
            await emit_event(thread_id, "tool_call", {
                "tool": "servicenow_get_incident",
                "status": "completed",
                "output": {"found": True, "state": result.get("state")}
            })
            
            import json
            state_map = {
                "1": "New",
                "2": "In Progress (AI Analyzed)",
                "3": "On Hold",
                "6": "Resolved",
                "7": "Closed",
                "8": "Canceled"
            }
            state_code = str(result.get("state", "1"))
            state_label = state_map.get(state_code, f"Unknown ({state_code})")
            
            return json.dumps({
                "status": "found",
                "incident": {
                    "number": result.get("number"),
                    "short_description": result.get("short_description"),
                    "description": result.get("description"),
                    "state": state_label,
                    "priority": result.get("priority"),
                    "sys_id": result.get("sys_id")
                }
            })
        else:
            await emit_event(thread_id, "tool_call", {
                "tool": "servicenow_get_incident",
                "status": "completed",
                "output": {"found": False}
            })
            return f'{{"status": "not_found", "incident_number": "{incident_number}"}}'
            
    except Exception as e:
        await emit_event(thread_id, "tool_call", {
            "tool": "servicenow_get_incident",
            "status": "failed",
            "error": str(e)
        })
        return f'{{"error": "Failed to get ServiceNow incident: {str(e)}"}}'

async def resolve_servicenow_incident_mcp(
    ctx: RunContext[AgentDeps], 
    incident_number: str, 
    resolution_note: str
) -> str:
    """Resolve incident in ServiceNow (In-Process)"""
    thread_id = get_thread_id(ctx)
    await emit_event(thread_id, "tool_call", {
        "tool": "servicenow_resolve_incident",
        "status": "started",
        "input": {"incident_number": incident_number}
    })
    
    try:
        result = await servicenow_service.resolve_incident(incident_number, resolution_note)
        
        await emit_event(thread_id, "tool_call", {
            "tool": "servicenow_resolve_incident",
            "status": "completed",
            "output": {"incident_number": result.get("number"), "state": result.get("state")}
        })
        
        import json
        state_map = {
            "1": "New",
            "2": "In Progress (AI Analyzed)",
            "3": "On Hold",
            "6": "Resolved",
            "7": "Closed",
            "8": "Canceled"
        }
        state_code = str(result.get("state", "6"))
        state_label = state_map.get(state_code, f"Unknown ({state_code})")
        
        return json.dumps({
            "status": "resolved",
            "incident_number": result.get("number"),
            "sys_id": result.get("sys_id"),
            "state": state_label,
            "close_notes": resolution_note
        })
        
    except Exception as e:
        await emit_event(thread_id, "tool_call", {
            "tool": "servicenow_resolve_incident",
            "status": "failed",
            "error": str(e)
        })
        return f'{{"error": "Failed to resolve ServiceNow incident: {str(e)}"}}'

async def delete_servicenow_incident_mcp(ctx: RunContext[AgentDeps], incident_number: str) -> str:
    """Delete incident in ServiceNow (In-Process)"""
    thread_id = get_thread_id(ctx)
    await emit_event(thread_id, "tool_call", {
        "tool": "servicenow_delete_incident",
        "status": "started",
        "input": {"incident_number": incident_number}
    })
    
    try:
        result = await servicenow_service.delete_incident(incident_number)
        
        await emit_event(thread_id, "tool_call", {
            "tool": "servicenow_delete_incident",
            "status": "completed",
            "output": {"incident_number": incident_number, "status": "deleted"}
        })
        
        import json
        return json.dumps({
            "status": "deleted",
            "incident_number": incident_number
        })
        
    except Exception as e:
        await emit_event(thread_id, "tool_call", {
            "tool": "servicenow_delete_incident",
            "status": "failed",
            "error": str(e)
        })
        return f'{{"error": "Failed to delete ServiceNow incident: {str(e)}"}}'

async def submit_servicenow_ticket(ctx: RunContext[AgentDeps], short_description: str, description: str, urgency: int) -> str:
    thread_id = get_thread_id(ctx)
    await emit_event(thread_id, "tool_call", {
        "tool": "servicenow_sync",
        "status": "started",
        "input": {"short_desc": short_description}
    })

    user = os.getenv("SERVICENOW_USER", "admin")
    password = os.getenv("SERVICENOW_PASSWORD", "vNl/20Kw+KsF")
    instance = os.getenv("SERVICENOW_INSTANCE", "dev269222")
    url = f"https://{instance}.service-now.com/api/now/table/incident"
    
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    payload = {
        "short_description": short_description,
        "description": description,
        "urgency": str(urgency),
        "caller_id": "abdelilah elgharbaoui" 
    }
    
    try:
        import requests
        import base64
        
        response = requests.post(url, auth=(user, password), headers=headers, json=payload, timeout=10)
        
        if response.status_code == 201:
            try:
                data = response.json()
                number = data["result"]["number"]
                
                await emit_event(thread_id, "tool_call", {
                    "tool": "servicenow_sync",
                    "status": "completed",
                    "output": {"servicenow_id": number}
                })
                return f'{{"service_now_id": "{number}", "status": "success"}}'
            except Exception:
                return f'{{"error": "Failed to parse response", "raw": "{response.text[:50]}"}}'
        else:
            await emit_event(thread_id, "tool_call", {"tool": "servicenow_sync", "status": "failed", "error": f"API {response.status_code}"})
            return f'{{"error": "API failed", "status": {response.status_code}}}'
    except Exception as e:
        await emit_event(thread_id, "tool_call", {"tool": "servicenow_sync", "status": "failed", "error": str(e)})
        return f'{{"error": "{str(e)}"}}'
