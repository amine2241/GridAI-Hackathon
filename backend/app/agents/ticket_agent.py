from pydantic_ai import Agent, RunContext
from typing import Any, List, Dict, Optional
from dataclasses import dataclass
import logfire
import json
import sys
import os

from ..services.tools import (
    submit_ticket_tool,
    get_my_tickets_tool,
    get_servicenow_incident_mcp,
    resolve_servicenow_incident_mcp,
    delete_servicenow_incident_mcp,
)
from ..core.database import get_db_prompt
from .models import TicketResponse, AgentDeps
from .utils import get_model

model = get_model()

ticket_agent = Agent(
    model,
    output_type=TicketResponse,
    deps_type=AgentDeps,
    retries=1,
)

@ticket_agent.system_prompt
def ticket_system_prompt(ctx: RunContext[AgentDeps]) -> str:
    return get_db_prompt("agent-ticket", default="You are the Ticket Creation Specialist.")

ticket_agent.tool(submit_ticket_tool)
ticket_agent.tool(get_my_tickets_tool)
ticket_agent.tool(get_servicenow_incident_mcp)
ticket_agent.tool(resolve_servicenow_incident_mcp)
ticket_agent.tool(delete_servicenow_incident_mcp)
