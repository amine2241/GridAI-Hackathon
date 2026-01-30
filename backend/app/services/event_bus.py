import asyncio
from collections import defaultdict
import json
import time

event_queues = defaultdict(asyncio.Queue)

async def emit_event(thread_id: str, event_type: str, data: dict):
    """Emit an event to all SSE clients listening to this thread"""
    if thread_id in event_queues:
        event = {
            "type": event_type,
            "data": data,
            "timestamp": time.time()
        }
        await event_queues[thread_id].put(event)

async def get_event_generator(thread_id: str):
    """Get an async generator for SSE events"""
    queue = event_queues[thread_id]
    try:
        while True:
            event = await queue.get()
            yield f"data: {json.dumps(event)}\n\n"
    except asyncio.CancelledError:
        if thread_id in event_queues:
            del event_queues[thread_id]
