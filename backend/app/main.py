from fastapi import FastAPI, Request
import sys
import os
import asyncio
from dotenv import load_dotenv

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

load_dotenv()

from fastapi.middleware.cors import CORSMiddleware
from mcp.server.sse import SseServerTransport
from loguru import logger

from .core.database import init_db
from .services.servicenow_mcp import mcp as sn_mcp
from mqtt_bridge import start_mqtt_bridge

from .api.endpoints.auth import router as auth_router
from .api.endpoints.chat import router as chat_router
from .api.endpoints.voice import router as voice_router
from .api.endpoints.system import router as system_router
from .api.endpoints.admin import router as admin_router
from .api.endpoints.tickets import router as tickets_router
from .api.endpoints.documents import router as documents_router
from .api.endpoints.agents import router as agents_router

logger.remove()
logger.add(sys.stderr, level="INFO")
logger.add("logs/backend_debug.log", level="DEBUG", rotation="1 MB")

app = FastAPI(title="AI Agent API")

@app.on_event("startup")
async def startup_event():
    """Initialize database and services on startup"""
    init_db()
    logger.info("Database initialized.")
    try:
        start_mqtt_bridge()
    except Exception as e:
        logger.error(f"Failed to start MQTT bridge: {e}")

sse = SseServerTransport("/mcp/messages")

@app.get("/mcp/sse", tags=["mcp"])
async def mcp_sse(request: Request):
    async with sse.connect_sse(request.scope, request.receive, request._send) as (read_stream, write_stream):
        await sn_mcp._server.run(
            read_stream,
            write_stream,
            sn_mcp._server.create_initialization_options()
        )

@app.post("/mcp/messages", tags=["mcp"])
async def mcp_messages(request: Request):
    await sse.handle_post_message(request.scope, request.receive, request._send)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(chat_router, prefix="/chat", tags=["chat"])
app.include_router(voice_router, prefix="/ws", tags=["voice"])
app.include_router(system_router, tags=["system"])
app.include_router(admin_router, prefix="/admin", tags=["admin"])
app.include_router(tickets_router, tags=["tickets"])
app.include_router(documents_router, prefix="/knowledge", tags=["knowledge base"])
app.include_router(agents_router, tags=["agents"])

@app.get("/", tags=["system"])
async def root():
    return {
        "message": "AI API is running",
        "status": "healthy",
        "docs": "/docs"
    }

@app.get("/health", tags=["system"])
async def health():
    return {"status": "healthy", "timestamp": str(asyncio.get_event_loop().time())}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
