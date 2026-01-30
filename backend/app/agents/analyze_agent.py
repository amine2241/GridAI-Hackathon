from pydantic_ai import Agent, RunContext
from typing import Any, List, Dict, Optional
from dataclasses import dataclass
import logfire
import json
import sys
import os

from ..services.tools import search_kb_tool, web_search_tool
from ..core.database import get_db_prompt
from .models import AgentDeps
from .utils import get_model

model = get_model()

analyze_agent = Agent(
    model,
    deps_type=AgentDeps,
    retries=2,
)

@analyze_agent.system_prompt
def analyze_system_prompt(ctx: RunContext[AgentDeps]) -> str:
    return get_db_prompt("agent-analyze", default="You are the Diagnostic AI. You investigate technical issues. Use the `web_search_tool` to research unknown error codes or complex technical terms if internal knowledge is insufficient.")

analyze_agent.tool(search_kb_tool)
analyze_agent.tool(web_search_tool)
