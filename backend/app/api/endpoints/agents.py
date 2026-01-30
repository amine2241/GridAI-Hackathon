from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class Agent(BaseModel):
    id: str
    name: str
    type: str  # 'Triage' | 'ServiceNow' | 'Knowledge' | 'Web Search' | 'Analysis'
    status: str  # 'Active' | 'Inactive'
    priority: int
    description: str
    systemPrompt: str
    tools: List[str]
    executionMode: str  # 'Automatic' | 'Human Approval'
    inputSchema: str
    outputSchema: str
    createdAt: str

# Mock agents data that matches your system's agents
AGENTS_DATA = [
    {
        "id": "agent-support",
        "name": "Support Agent",
        "type": "Triage",
        "status": "Active",
        "priority": 1,
        "description": "Handles initial customer support inquiries and routes to appropriate agents",
        "systemPrompt": "You are a customer support agent that helps users with their inquiries.",
        "tools": ["web_search", "knowledge_base"],
        "executionMode": "Automatic",
        "inputSchema": "{}",
        "outputSchema": "{}",
        "createdAt": "2024-01-01T00:00:00Z"
    },
    {
        "id": "agent-ticket",
        "name": "Ticket Agent",
        "type": "ServiceNow",
        "status": "Active",
        "priority": 2,
        "description": "Creates and manages ServiceNow tickets",
        "systemPrompt": "You are a ticket management agent that handles ServiceNow ticket operations.",
        "tools": ["servicenow_api", "ticket_creation"],
        "executionMode": "Automatic",
        "inputSchema": "{}",
        "outputSchema": "{}",
        "createdAt": "2024-01-01T00:00:00Z"
    },
    {
        "id": "agent-rag",
        "name": "RAG Agent",
        "type": "Knowledge",
        "status": "Active",
        "priority": 3,
        "description": "Retrieves information from knowledge base using RAG",
        "systemPrompt": "You are a knowledge retrieval agent that uses RAG to find relevant information.",
        "tools": ["rag_search", "document_retrieval"],
        "executionMode": "Automatic",
        "inputSchema": "{}",
        "outputSchema": "{}",
        "createdAt": "2024-01-01T00:00:00Z"
    },
    {
        "id": "agent-analyze",
        "name": "Analysis Agent",
        "type": "Analysis",
        "status": "Active",
        "priority": 4,
        "description": "Analyzes incidents and provides insights",
        "systemPrompt": "You are an analysis agent that analyzes incidents and provides insights.",
        "tools": ["data_analysis", "pattern_detection"],
        "executionMode": "Automatic",
        "inputSchema": "{}",
        "outputSchema": "{}",
        "createdAt": "2024-01-01T00:00:00Z"
    },
    {
        "id": "agent-iot",
        "name": "IoT Analyzer Agent",
        "type": "Analysis",
        "status": "Active",
        "priority": 5,
        "description": "Analyzes IoT device telemetry and issues",
        "systemPrompt": "You are an IoT analysis agent that monitors and analyzes IoT device data.",
        "tools": ["iot_monitoring", "telemetry_analysis"],
        "executionMode": "Automatic",
        "inputSchema": "{}",
        "outputSchema": "{}",
        "createdAt": "2024-01-01T00:00:00Z"
    }
]

@router.get("/agents", response_model=List[Agent])
async def get_agents():
    """Get all agents"""
    return AGENTS_DATA

@router.get("/agents/{agent_id}", response_model=Agent)
async def get_agent(agent_id: str):
    """Get a specific agent by ID"""
    agent = next((agent for agent in AGENTS_DATA if agent["id"] == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.patch("/agents/{agent_id}", response_model=Agent)
async def update_agent(agent_id: str, updates: dict):
    """Update an agent"""
    agent = next((agent for agent in AGENTS_DATA if agent["id"] == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Update the agent with provided fields
    agent.update(updates)
    return agent

@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete an agent"""
    global AGENTS_DATA
    agent = next((agent for agent in AGENTS_DATA if agent["id"] == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    AGENTS_DATA = [a for a in AGENTS_DATA if a["id"] != agent_id]
    return {"message": "Agent deleted successfully"}
