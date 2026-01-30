from mcp.server.fastmcp import FastMCP
from mcp.types import Tool, TextContent, EmbeddedResource
from app.services.servicenow_service import servicenow_service
from typing import List, Dict, Any, Optional
import json

mcp = FastMCP("servicenow-mcp")


@mcp.tool()
async def get_incidents(priority: str = "3") -> str:
    """
    Retrieves incidents from ServiceNow filtered by priority.
    priority: 1 (Critical), 2 (High), 3 (Moderate), 4 (Low), 5 (Planning)
    """
    try:
        incidents = await servicenow_service.get_incidents(priority=priority, limit=5)
        
        if not incidents:
            return f"No incidents found with priority {priority}."
        
        formatted = []
        for inc in incidents:
            formatted.append(
                f"Number: {inc.get('number')}\n"
                f"Short Description: {inc.get('short_description')}\n"
                f"State: {inc.get('state')}\n"
                f"Priority: {inc.get('priority')}\n"
                f"---"
            )
        
        return "\n".join(formatted)
    except Exception as e:
        return f"Error retrieving incidents: {str(e)}"

@mcp.tool()
async def create_incident(short_description: str, description: str = "", impact: str = "medium") -> str:
    """
    Creates a new incident in ServiceNow.
    short_description: Brief summary
    description: Detailed description
    impact: low, medium, high
    """
    try:
        issue = f"{short_description}\n\n{description}"
        result = await servicenow_service.create_incident(issue, impact)
        
        return f"Incident created successfully. Number: {result.get('number')}"
    except Exception as e:
        return f"Error creating incident: {str(e)}"

@mcp.tool()
async def get_incident_details(number: str) -> str:
    """
    Retrieves full details for a specific incident by number.
    """
    try:
        incident = await servicenow_service.get_incident(number)
        if not incident:
            return f"Incident {number} not found."
            
        return json.dumps(incident, indent=2)
    except Exception as e:
        return f"Error retrieving incident details: {str(e)}"

@mcp.tool()
async def resolve_incident(number: str, resolution_note: str) -> str:
    """
    Resolves an existing incident.
    """
    try:
        result = await servicenow_service.resolve_incident(number, resolution_note)
        return f"Incident {number} resolved. State: {result.get('state')}"
    except Exception as e:
        return f"Error resolving incident: {str(e)}"

@mcp.tool()
async def delete_incident(number: str) -> str:
    """
    Deletes an incident (admin only).
    """
    try:
        result = await servicenow_service.delete_incident(number)
        return f"Incident {number} deleted successfully."
    except Exception as e:
        return f"Error deleting incident: {str(e)}"