from pydantic_ai import Agent, RunContext
from pydantic import BaseModel, EmailStr
from typing import Any, List, Dict, Optional
from dataclasses import dataclass, field
import logfire
import json
import sys
import os

from ..core.database import get_db_prompt
from .models import SupportResponse, AgentDeps
from .utils import get_model

model = get_model()

support_agent = Agent(
    model,
    output_type=SupportResponse,
    deps_type=AgentDeps,
    retries=2,
)

@support_agent.system_prompt
def support_system_prompt(ctx: RunContext[AgentDeps]) -> str:
    from loguru import logger
    prompt = get_db_prompt("agent-support", default="You are the AI Assistant.")
    
    logger.debug(f"[SUPPORT AGENT] Deps available - Name: {ctx.deps.user_name}, Email: {ctx.deps.user_email}, Phone: {ctx.deps.user_phone}, Address: {ctx.deps.user_address}")
    
    try:
        formatted_prompt = prompt.format(ctx=ctx)
        logger.debug(f"[SUPPORT AGENT] System prompt formatted successfully (length: {len(formatted_prompt)})")
        return formatted_prompt
    except Exception as e:
        logger.warning(f"[SUPPORT AGENT] Failed to format system prompt: {e}. Using default.")
        return prompt


