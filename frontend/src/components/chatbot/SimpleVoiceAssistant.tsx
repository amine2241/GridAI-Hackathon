"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { PhoneOff, Loader2, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface SimpleVoiceAssistantProps {
    onDisconnect: () => void
}

export function SimpleVoiceAssistant({ onDisconnect }: SimpleVoiceAssistantProps) {
    const [status, setStatus] = useState<"connecting" | "listening" | "processing" | "speaking" | "error">("connecting")
    const [volume, setVolume] = useState(0)
    const [errorMsg, setErrorMsg] = useState("")

    const websocketRef = useRef<WebSocket | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const isRecordingRef = useRef(false)
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
    const audioQueueRef = useRef<Blob[]>([])
    const isPlayingRef = useRef(false)

    // VAD Parameters
    const VAD_THRESHOLD = 30 // 0-255 based on ByteFrequencyData
    const SILENCE_DURATION = 1500 // ms to wait before considering speech ended

    const cleanup = useCallback(() => {
        if (websocketRef.current) {
            websocketRef.current.close()
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop()
        }
        if (audioContextRef.current) {
            audioContextRef.current.close()
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
        }
    }, [])

    const stopRecordingAndSend = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop()
        }
    }, [])

    const startRecording = useCallback((stream: MediaStream) => {
        const recorder = new MediaRecorder(stream)
        mediaRecorderRef.current = recorder
        audioChunksRef.current = []

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                audioChunksRef.current.push(e.data)
            }
        }

        recorder.onstop = () => {
            if (audioChunksRef.current.length > 0 && websocketRef.current?.readyState === WebSocket.OPEN) {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                setStatus("processing")
                websocketRef.current.send(blob)
                toast.info(`Sent ${blob.size} bytes of audio`)
                audioChunksRef.current = []
            }
            if (websocketRef.current?.readyState === WebSocket.OPEN) {
                recorder.start()
                setStatus("listening")
            }
        }

        recorder.start()
    }, [])

    const monitorVolume = useCallback(() => {
        if (!analyserRef.current) return

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

        const check = () => {
            if (!analyserRef.current) return
            analyserRef.current.getByteFrequencyData(dataArray)

            let sum = 0
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i]
            }
            const avg = sum / dataArray.length
            setVolume(avg)

            if (avg > VAD_THRESHOLD) {
                if (!isRecordingRef.current) {
                    isRecordingRef.current = true
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "inactive") {
                        mediaRecorderRef.current.start()
                    }
                }
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current)
                    silenceTimerRef.current = null
                }
            } else if (isRecordingRef.current) {
                if (!silenceTimerRef.current) {
                    silenceTimerRef.current = setTimeout(() => {
                        isRecordingRef.current = false
                        stopRecordingAndSend()
                    }, SILENCE_DURATION)
                }
            }

            requestAnimationFrame(check)
        }
        check()
    }, [stopRecordingAndSend])

    const playQueue = useCallback(async () => {
        if (isPlayingRef.current) return
        if (audioQueueRef.current.length === 0) {
            setStatus("listening")
            return
        }

        isPlayingRef.current = true
        const blob = audioQueueRef.current.shift()
        if (!blob) return

        try {
            const audioUrl = URL.createObjectURL(blob)
            const audio = new Audio(audioUrl)

            audio.onended = () => {
                isPlayingRef.current = false
                playQueue()
                URL.revokeObjectURL(audioUrl)
            }

            await audio.play()
        } catch (e) {
            console.error("Playback error", e)
            isPlayingRef.current = false
            playQueue()
        }
    }, [])

    const startSession = useCallback(async () => {
        try {
            setStatus("connecting")
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
            audioContextRef.current = audioCtx
            const source = audioCtx.createMediaStreamSource(stream)
            const analyser = audioCtx.createAnalyser()
            analyser.fftSize = 256
            source.connect(analyser)
            analyserRef.current = analyser

            const wsUrl = `ws://localhost:8000/ws/voice`
            const ws = new WebSocket(wsUrl)
            websocketRef.current = ws

            ws.onopen = () => {
                toast.success("Voice System Connected")
                setStatus("listening")
                startRecording(stream)
                monitorVolume()
            }

            ws.onmessage = async (event) => {
                if (event.data instanceof Blob) {
                    setStatus("speaking")
                    audioQueueRef.current.push(event.data)
                    playQueue()
                }
            }

            ws.onclose = () => {
                console.log("WS Closed")
            }

            ws.onerror = (e) => {
                console.error("WS Error", e)
                setStatus("error")
                setErrorMsg("Connection failed")
                toast.error("WebSocket Connection Failed")
            }

        } catch (e) {
            console.error(e)
            setStatus("error")
            setErrorMsg("Microphone access denied or error")
            toast.error("Microphone Access Denied")
        }
    }, [monitorVolume, playQueue, startRecording])

    useEffect(() => {
        startSession()
        return () => {
            cleanup()
        }
    }, [startSession, cleanup])

    return (
        <div className="flex flex-col items-center justify-center p-8 h-full bg-slate-950/95 backdrop-blur-xl text-white rounded-lg border border-primary/20 shadow-2xl relative transition-all duration-500 w-[300px] h-[400px]">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-slate-950/50 to-slate-950 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center gap-8">

                {/* Status Indicator */}
                <div className={cn(
                    "flex items-center gap-2 px-3 py-1 rounded-full border bg-slate-900/80 backdrop-blur-md transition-colors duration-300",
                    status === "error" ? "border-red-500/50 text-red-400" :
                        status === "connecting" ? "border-blue-500/50 text-blue-400" :
                            "border-green-500/50 text-green-400"
                )}>
                    <div className={cn("w-2 h-2 rounded-full",
                        status === "processing" ? "bg-yellow-400 animate-pulse" :
                            status === "speaking" ? "bg-green-400 animate-pulse" :
                                "bg-current"
                    )} />
                    <span className="text-[10px] font-mono tracking-wider uppercase">
                        {status === "processing" ? "THINKING..." : status.toUpperCase()}
                    </span>
                </div>

                {/* Main Visualizer */}
                <div className="relative">
                    {/* Halo */}
                    <div className={cn(
                        "absolute inset-0 rounded-full blur-xl transition-all duration-300",
                        status === "speaking" ? "bg-green-500/30 scale-125" :
                            status === "processing" ? "bg-yellow-500/20 scale-110" :
                                volume > 10 ? "bg-primary/20 scale-110" : "bg-transparent scale-100"
                    )} />

                    <div className={cn(
                        "h-32 w-32 rounded-full border-4 flex items-center justify-center bg-slate-900 transition-all duration-200",
                        status === "speaking" ? "border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]" :
                            status === "processing" ? "border-yellow-500/50" :
                                volume > 10 ? "border-primary shadow-[0_0_30px_rgba(0,112,173,0.4)] scale-105" : "border-slate-800"
                    )}>
                        {status === "connecting" || status === "processing" ? (
                            <Loader2 className="w-12 h-12 text-slate-500 animate-spin" />
                        ) : status === "speaking" ? (
                            <Activity className="w-12 h-12 text-green-500 animate-pulse" />
                        ) : (
                            // Simple volume visualizer
                            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center transform transition-transform duration-75"
                                style={{ transform: `scale(${1 + volume / 100})` }}>
                                <div className="w-8 h-8 rounded-full bg-primary" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <Button
                    variant="destructive"
                    size="icon"
                    className="rounded-full h-12 w-12 shadow-lg hover:shadow-red-500/20"
                    onClick={onDisconnect}
                >
                    <PhoneOff className="w-5 h-5" />
                </Button>
            </div>

            {errorMsg && (
                <div className="absolute bottom-4 text-xs text-red-500 bg-red-950/50 px-2 py-1 rounded">
                    {errorMsg}
                </div>
            )}
        </div>
    )
}
