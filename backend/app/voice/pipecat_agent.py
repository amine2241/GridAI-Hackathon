from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.services.cartesia import CartesiaTTSService
from pipecat.services.deepgram import DeepgramSTTService, LiveOptions
from pipecat.services.openai import OpenAILLMService
from pipecat.frames.frames import (
    Frame, 
    TextFrame, 
    InterruptionFrame, 
    TTSStoppedFrame, 
    EndFrame, 
    InputAudioRawFrame, 
    OutputAudioRawFrame,
    AudioRawFrame,
    StartFrame
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.transports.network.fastapi_websocket import FastAPIWebsocketTransport, FastAPIWebsocketParams
from pipecat.services.google import GeminiTTSService
from pipecat.serializers.base_serializer import FrameSerializer, FrameSerializerType

from loguru import logger
from dotenv import load_dotenv
import os
import sys
import asyncio
from fastapi import WebSocket

from ..services.event_bus import emit_event

load_dotenv()

class SimpleRawFrameSerializer(FrameSerializer):
    @property
    def type(self) -> FrameSerializerType:
        return FrameSerializerType.BINARY

    async def serialize(self, frame: Frame) -> str | bytes | None:
        if isinstance(frame, AudioRawFrame):
            if len(frame.audio) > 0:
                logger.debug(f"Serializing audio frame: {len(frame.audio)} bytes")
            return frame.audio
        return None

    async def deserialize(self, data: str | bytes) -> Frame | None:
        return InputAudioRawFrame(audio=data, num_channels=1, sample_rate=16000)

class LanggraphProcessor(FrameProcessor):
    """
    Custom Pipecat Processor that bridges to LangGraph's system_app.
    It listens for TextFrames (from STT) and invokes the agent.
    """
    def __init__(self, system_app, thread_id: str = "public-voice-session"):
        super().__init__()
        self._system_app = system_app
        self._thread_id = thread_id
        self._langgraph_task = None
        self._last_transcript = ""
        self._last_transcript_time = 0

    async def _run_langgraph(self, transcript):
        try:
            logger.info(f"LanggraphProcessor: Processing transcript: {transcript}")
            
            # Emit user transcript via SSE so it appears in the chat UI
            await emit_event(self._thread_id, "user_transcript", {"text": transcript})

            config = {"configurable": {"thread_id": self._thread_id}}
            result = await self._system_app.ainvoke(
                {"messages": [("human", transcript)]},
                config=config
            )
            
            messages = result.get("messages", [])
            if not messages:
                return
                
            last_message = messages[-1]
            if isinstance(last_message, tuple):
                ai_text = last_message[1]
            else:
                ai_text = last_message.content if hasattr(last_message, 'content') else str(last_message)
            
            logger.info(f"LanggraphProcessor: Agent response: {ai_text}")
            
            # Emit bot response via SSE
            await emit_event(self._thread_id, "text_chunk", {"text": ai_text})
            
            await self.push_frame(TextFrame(ai_text))

            intent = result.get("intent")
            if intent == "end":
                logger.info("LanggraphProcessor: End intent detected, closing call...")
                await asyncio.sleep(2) 
                await self.push_frame(EndFrame())
            
        except asyncio.CancelledError:
            logger.info("LanggraphProcessor: Task cancelled (interrupted).")
        except Exception as e:
            logger.error(f"LanggraphProcessor Error: {e}")
            await self.push_frame(TextFrame("I'm sorry, I encountered an error processing your request."))

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        if isinstance(frame, InterruptionFrame):
            logger.info("LanggraphProcessor: Interruption received, cancelling thinking...")
            if self._langgraph_task:
                self._langgraph_task.cancel()
                self._langgraph_task = None
            await self.push_frame(frame, direction)
            return

        await super().process_frame(frame, direction)

        if isinstance(frame, TextFrame):
            # Skip if it's the internal greeting frame
            if getattr(frame, "skip_agent", False):
                await self.push_frame(frame, direction)
                return

            transcript = frame.text.strip()
            if not transcript:
                return

            logger.info(f"LanggraphProcessor: Processing transcript: {transcript}")
            
            # De-duplicate: ignore if same transcript in last 1 second
            import time
            now = time.time()
            if transcript == self._last_transcript and (now - self._last_transcript_time) < 1.0:
                logger.info(f"LanggraphProcessor: Ignoring duplicate transcript: {transcript}")
                return
            
            self._last_transcript = transcript
            self._last_transcript_time = now

            if self._langgraph_task:
                self._langgraph_task.cancel()
            
            self._langgraph_task = asyncio.create_task(self._run_langgraph(transcript))
        else:
            await self.push_frame(frame, direction)

class InterruptionSignalProcessor(FrameProcessor):
    """
    Detects InterruptionFrame and sends a signal to the frontend to stop audio playback.
    """
    async def process_frame(self, frame: Frame, direction: FrameDirection):
        # Handle system frames (StartFrame, etc.) through parent
        await super().process_frame(frame, direction)
        
        # If it's an interruption, send signal to frontend
        if isinstance(frame, InterruptionFrame):
            logger.info("InterruptionSignalProcessor: Sending stop signal to frontend")
            # Send a special text frame that frontend will recognize
            stop_signal = TextFrame("__INTERRUPT__")
            setattr(stop_signal, "is_interrupt_signal", True)
            await self.push_frame(stop_signal, direction)
        
        # Always push the original frame forward (super() doesn't do this for us)
        await self.push_frame(frame, direction)

async def run_pipecat_agent(websocket: WebSocket, thread_id: str = "public-voice-session"):
    """
    Spawns a Pipecat agent that connects via a direct FastAPI WebSocket.
    """
    logger.info(f"Starting Pipecat agent (Public) - Thread: {thread_id}...")
    from ..agents.graph import public_agent_app
    
    system_app = public_agent_app
    
    logger.info("Initializing transport...")
    transport = FastAPIWebsocketTransport(
        websocket=websocket,
        params=FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            audio_in_sample_rate=16000,
            audio_out_sample_rate=16000,
            vad_analyzer=SileroVADAnalyzer(
                params=VADParams(
                    start_secs=0.6, # Less sensitive to short noises
                    stop_secs=1.0,
                    confidence=0.7
                )
            ),
            add_wav_header=False,
            serializer=SimpleRawFrameSerializer()
        )
    )
    
    stt = DeepgramSTTService(
        api_key=os.getenv("DEEPGRAM_API_KEY"),
        live_options=LiveOptions(
            encoding="linear16",
            sample_rate=16000,
            channels=1,
            interim_results=True,
            smart_format=True
        )
    )
    
    logger.info("Using Cartesia TTS service...")
    tts = CartesiaTTSService(
        api_key=os.getenv("CARTESIA_API_KEY"),
        voice_id="a01c369f-6d2d-4185-bc20-b32c225eab70", # Fiona (British Witty Woman)
        sample_rate=16000
    )

    logger.info("Creating pipeline...")
    agent_processor = LanggraphProcessor(system_app, thread_id=thread_id)
    interruption_signal = InterruptionSignalProcessor()

    pipeline = Pipeline([
        transport.input(),
        interruption_signal,  # Detect interruptions and signal frontend
        stt,
        agent_processor,
        tts,
        transport.output(),
    ])

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True,
            enable_metrics=True,
        ),
    )

    logger.info("Queueing initial frame...")
    greeting_frame = TextFrame("Hello! I'm your AI assistant. How can I help you today?")
    setattr(greeting_frame, "skip_agent", True) # Mark so processor ignores it
    await task.queue_frames([greeting_frame])

    runner = PipelineRunner()
    
    logger.info("Running pipeline task...")

    try:
        logger.info("Runner starting...")
        await runner.run(task)
        logger.info("Runner stopped normally.")
    except Exception as e:
        logger.error(f"Pipecat Runner Exception: {e}", exc_info=True)
    finally:
        logger.info("Pipecat pipeline finished.")
