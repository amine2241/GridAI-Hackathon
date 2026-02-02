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
import re

class FrontendControlFrame(Frame):

    def __init__(self, text: str):
        super().__init__()
        self.text = text
    def __str__(self):
        return f"FrontendControlFrame(text={self.text})"

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
        if isinstance(frame, FrontendControlFrame):
            logger.debug(f"Serializing control frame: {frame.text}")
            return frame.text
        return None

    async def deserialize(self, data: str | bytes) -> Frame | None:
        if isinstance(data, str):
            return FrontendControlFrame(text=data)
        return InputAudioRawFrame(audio=data, num_channels=1, sample_rate=16000)

class LanggraphProcessor(FrameProcessor):
    """
    Consolidated Voice Processor.
    Handles:
    1. LangGraph bridging (STT -> LLM)
    2. Text Cleaning (LLM -> TTS)
    3. Frontend Interruption Signaling
    4. Reliable Frame Propagation
    """
    def __init__(self, system_app, thread_id: str = "public-voice-session"):
        super().__init__()
        self._system_app = system_app
        self._thread_id = thread_id
        self._langgraph_task = None
        self._last_transcript = ""
        self._last_transcript_time = 0

    def _clean_text(self, text: str) -> str:
        if not text or text == "__INTERRUPT__":
            return ""
            
        # 1. Strip Markdown links: [text](url) -> text
        text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)

        # 2. Remove LaTeX math blocks: \[ ... \] and \( ... \)
        text = re.sub(r'\\\[.*?\\\]', '', text, flags=re.DOTALL)
        text = re.sub(r'\\\(.*?\\\)', '', text, flags=re.DOTALL)
        
        # 3. Remove LaTeX commands like \text{...}, \frac{...}{...}, etc.
        text = re.sub(r'\\[a-z]+\{([^}]*)\}', r'\1', text)
        
        # 4. Remove Markdown bold/italic/headers
        text = re.sub(r'[*_#]{1,3}', '', text)
        
        # 5. Remove math symbols that don't belong in speech
        text = text.replace('\\times', 'times')
        text = text.replace('\\cdot', 'times')
        text = text.replace('\\approx', 'approximately')
        text = text.replace('\\pm', 'plus or minus')
        text = text.replace('\\=', '=')
        text = text.replace('=', 'equals')
        text = text.replace('+', 'plus')
        
        # 6. Remove remaining backslashes, brackets, and braces
        text = re.sub(r'[\\\[\]{}]', '', text)
        
        # 7. Clean up whitespace and repetitive punctuation
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'([!?.])\1+', r'\1', text) 
        
        return text.strip()

    async def _run_langgraph(self, transcript):
        try:
            logger.info(f"[VOICE] Processing transcript: {transcript}")
            
            # Emit user transcript via SSE for chat UI
            if transcript != "__INTERRUPT__" and len(transcript) > 1:
                await emit_event(self._thread_id, "user_transcript", {"text": transcript})

            config = {"configurable": {"thread_id": self._thread_id}}
            result = await self._system_app.ainvoke(
                {"messages": [("human", transcript)]},
                config=config
            )
            
            messages = result.get("messages", [])
            if not messages:
                logger.warning("[VOICE] No response messages from LangGraph")
                return
                
            last_message = messages[-1]
            if isinstance(last_message, tuple):
                ai_text = last_message[1]
            else:
                ai_text = last_message.content if hasattr(last_message, 'content') else str(last_message)
            
            logger.info(f"[VOICE] Agent response: {ai_text}")
            
            # 1. Emit bot text response via SSE
            await emit_event(self._thread_id, "text_chunk", {"text": ai_text})
            
            # 2. Clean text for TTS
            cleaned_text = self._clean_text(ai_text)
            
            # 3. Push to TTS
            if cleaned_text:
                logger.info(f"[VOICE] Pushing cleaned text for TTS: {cleaned_text}")
                await self.push_frame(TextFrame(cleaned_text))
            else:
                logger.warning("[VOICE] Cleaned text is empty, nothing to speak")

            intent = result.get("intent")
            if intent == "end":
                logger.info("[VOICE] End intent detected, closing call...")
                await asyncio.sleep(2) 
                await self.push_frame(EndFrame())
            
        except asyncio.CancelledError:
            logger.info("[VOICE] Task cancelled (interrupted).")
        except Exception as e:
            logger.error(f"[VOICE] Processor Error: {e}", exc_info=True)
            error_msg = "I'm sorry, I encountered an error processing your request."
            await emit_event(self._thread_id, "text_chunk", {"text": error_msg})
            await self.push_frame(TextFrame(error_msg))

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        # Always call super() for state management
        await super().process_frame(frame, direction)

        # A. INTERRUPTIONS
        if isinstance(frame, InterruptionFrame):
            logger.info("[VOICE] Interruption received")
            # 1. Cancel current processing
            if self._langgraph_task:
                self._langgraph_task.cancel()
                self._langgraph_task = None
            
            # 2. Send SILENT signal to frontend to stop existing audio
            await self.push_frame(FrontendControlFrame("__INTERRUPT__"), direction)
            
            # 3. Forward interruption downstream (to stop TTS)
            await self.push_frame(frame, direction)
            return

        # B. TEXT FROM STT 
        if isinstance(frame, TextFrame) and direction == FrameDirection.DOWNSTREAM:
            if getattr(frame, "skip_agent", False) or frame.text == "__INTERRUPT__":
                if not getattr(frame, "is_interrupt_signal", False):
                    cleaned_greeting = self._clean_text(frame.text)
                    if cleaned_greeting:
                        logger.info(f"[VOICE] Pushing cleaned greeting: {cleaned_greeting}")
                        await self.push_frame(TextFrame(cleaned_greeting), direction)
                else:
                    await self.push_frame(frame, direction)
                return

            transcript = frame.text.strip()
            if not transcript:
                return

            # C. DE-DUPLICATION
            import time
            now = time.time()
            if transcript == self._last_transcript and (now - self._last_transcript_time) < 1.0:
                logger.info(f"[VOICE] Ignoring duplicate transcript: {transcript}")
                return
            
            self._last_transcript = transcript
            self._last_transcript_time = now

            # D. START AGENT TASK
            if self._langgraph_task:
                self._langgraph_task.cancel()
            
            self._langgraph_task = asyncio.create_task(self._run_langgraph(transcript))
            return

        # E. PASS-THROUGH FOR ALL OTHER FRAMES (Audio, StartFrame, EndFrame)
        await self.push_frame(frame, direction)

async def run_pipecat_agent(websocket: WebSocket, thread_id: str = "public-voice-session"):
    """
    Spawns a Pipecat agent that connects via a direct FastAPI WebSocket.
    """
    logger.info(f"Starting Consolidated Pipecat Agent - Thread: {thread_id}...")
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
                    start_secs=0.2,
                    stop_secs=0.8,
                    confidence=0.6
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
            interim_results=False,
            smart_format=True
        )
    )
    
    logger.info("Using Cartesia TTS service...")
    tts = CartesiaTTSService(
        api_key=os.getenv("CARTESIA_API_KEY"),
        voice_id="829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30", # Professional Customer Support
        sample_rate=16000
    )

    logger.info("Creating consolidated pipeline...")
    agent_processor = LanggraphProcessor(system_app, thread_id=thread_id)

    pipeline = Pipeline([
        transport.input(),
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

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info(f"Client disconnected: {thread_id}")
        await task.cancel()

    logger.info("Queueing initial frame...")
    greeting_frame = TextFrame("Hello! I'm your AI assistant. How can I help you today?")
    setattr(greeting_frame, "skip_agent", True) 
    await task.queue_frames([greeting_frame])

    runner = PipelineRunner()
    
    try:
        logger.info("Pipecat Runner starting...")
        await runner.run(task)
        logger.info("Pipecat Runner stopped.")
    except asyncio.CancelledError:
        logger.info("Pipecat task cancelled.")
    except Exception as e:
        logger.error(f"Pipecat Runner error: {e}", exc_info=True)
    finally:
        if not task.has_finished():
            await task.cancel()
        logger.info(f"Pipecat pipeline finished: {thread_id}")
