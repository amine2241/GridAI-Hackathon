from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from loguru import logger
from typing import Optional

from ...voice.pipecat_agent import run_pipecat_agent

router = APIRouter()

@router.websocket("/test")
async def websocket_test(websocket: WebSocket):
    await websocket.accept()
    print("TEST: WebSocket connected!", flush=True)
    await websocket.send_text("Hello from server!")
    print("TEST: Sent hello", flush=True)
    try:
        while True:
            data = await websocket.receive_text()
            print(f"TEST: Received: {data}", flush=True)
            await websocket.send_text(f"Echo: {data}")
    finally:
        print("TEST: Disconnected", flush=True)
        
@router.websocket("/voice")
async def websocket_voice_endpoint(websocket: WebSocket, thread_id: Optional[str] = None):
    await websocket.accept()
    logger.info(f"Voice WebSocket connected (Pipecat) - Thread: {thread_id}")
    try:
        await run_pipecat_agent(websocket, thread_id)
    except Exception as e:
        logger.error(f"Error in Pipecat voice endpoint: {e}")
    finally:
        logger.info("Voice WebSocket connection closed")
