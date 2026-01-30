from pydantic_ai import Agent, RunContext
from pydantic import BaseModel
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

rag_agent = Agent(
    model,
    deps_type=AgentDeps,
    retries=2,
)

@rag_agent.system_prompt
def rag_system_prompt(ctx: RunContext[AgentDeps]) -> str:
    return get_db_prompt("agent-rag", default="You are the Technical Knowledge Specialist.")

rag_agent.tool(search_kb_tool)
rag_agent.tool(web_search_tool)
