from pydantic_ai import Agent, RunContext
from pydantic import BaseModel, EmailStr
from typing import Any, List, Dict, Optional
from dataclasses import dataclass, field
import logfire
import json
import sys
import os

from ..services.tools import (
    submit_ticket_tool
)
from ..core.database import get_db_prompt
from .models import AgentDeps
from .utils import get_model

model = get_model()

class IoTAnalysisResult(BaseModel):
    priority: str
    incident_subject: str
    technical_category: str
    reconstructed_description: str
    reasoning: str
    ticket_id: Optional[str] = None
    ticket_status: Optional[str] = None

iot_analyzer_agent = Agent(
    model,
    output_type=IoTAnalysisResult,
    deps_type=AgentDeps,
    retries=1,
)

@iot_analyzer_agent.system_prompt
def iot_system_prompt(ctx: RunContext[AgentDeps]) -> str:
    base_prompt = get_db_prompt("agent-iot", default="You are the Industrial IoT Systems Analyst.")
    
    user_email = ctx.deps.user_email
    
    additional_instructions = f"""
    
    **CRITICAL INCIDENT PROTOCOL:**
    If you analyze the incoming data and determine the priority is **HIGH** or **CRITICAL**:
    1. You MUST use the `submit_ticket_tool` immediately to create a ticket.
    2. Do NOT ask for permission.
    3. Mandatory tool arguments:
       - `subject`: Use your `incident_subject`.
       - `description`: Use your `reconstructed_description`.
       - `priority`: Use the detected priority (e.g., "Critical" or "High").
       - `email`: Use this exact email address: {user_email}
       - `category`: Use your `technical_category`. Must be one of: `inquiry`, `software`, `hardware`, `network`, `database`, `electricity_outage`, `billing`, `supply_safety`.
       - `contact_type`: "iot".
    4. Populate the `ticket_id` and `ticket_status` fields in your final response using the values returned by the tool.
    
    If the priority is LOW or MEDIUM, do NOT create a ticket unless explicitly told to. just log it.
    """
    return base_prompt + additional_instructions

iot_analyzer_agent.tool(submit_ticket_tool)
