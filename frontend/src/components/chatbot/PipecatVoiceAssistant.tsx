"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { PhoneOff, Loader2, Mic, MicOff, Volume2 } from "lucide-react"
import { toast } from "sonner"
import { PCMPlayer, PCMCapturer } from "@/lib/audio-utils"

interface PipecatVoiceAssistantProps {
    threadId: string
    onDisconnect: () => void
}

export function PipecatVoiceAssistant({ threadId, onDisconnect }: PipecatVoiceAssistantProps) {
    const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting")
    const [isMuted, setIsMuted] = useState(false)
    const [isUserSpeaking, setIsUserSpeaking] = useState(false)
    const [isAgentSpeaking, setIsAgentSpeaking] = useState(false)

    const socketRef = useRef<WebSocket | null>(null)
    const playerRef = useRef<PCMPlayer | null>(null)
    const capturerRef = useRef<PCMCapturer | null>(null)
    const isMutedRef = useRef(false)
    const isUserSpeakingRef = useRef(false)

    useEffect(() => {
        isMutedRef.current = isMuted
    }, [isMuted])

    useEffect(() => {
        isUserSpeakingRef.current = isUserSpeaking
    }, [isUserSpeaking])

    useEffect(() => {
        let mounted = true

        const connect = async () => {
            try {
                // Initialize PCM Player (Audio Playback)
                playerRef.current = new PCMPlayer(16000)

                // WebSocket URL from environment or fallback
                const wsUrl = `ws://localhost:8000/ws/voice?thread_id=${threadId}`
                const ws = new WebSocket(wsUrl)
                ws.binaryType = "arraybuffer"
                socketRef.current = ws

                ws.onopen = async () => {
                    if (!mounted) return
                    setStatus("connected")
                    toast.success("Voice Connected")

                    // Start Capturer (Microphone Input) with VAD
                    capturerRef.current = new PCMCapturer((data) => {
                        // Simple VAD based on volume averages
                        let sum = 0
                        for (let i = 0; i < data.length; i++) {
                            sum += Math.abs(data[i])
                        }
                        const avgVolume = sum / data.length
                        const isSpeaking = avgVolume > 1500 // Threshold for speech

                        if (isSpeaking && !isUserSpeakingRef.current) {
                            setIsUserSpeaking(true)
                            // Immediate interruption: clear playback buffer
                            playerRef.current?.clearBuffer()
                            setIsAgentSpeaking(false)
                        } else if (!isSpeaking && isUserSpeakingRef.current) {
                            setIsUserSpeaking(false)
                        }

                        if (ws.readyState === WebSocket.OPEN && !isMutedRef.current) {
                            ws.send(data.buffer)
                        }
                    })

                    await capturerRef.current.start().catch(err => {
                        console.error("Capturer start error:", err)
                        toast.error("Microphone access failed")
                    })
                }

                ws.onerror = (e) => {
                    console.error("WebSocket Error Event:", e)
                }

                ws.onclose = (event) => {
                    console.log(`WebSocket closed: Code ${event.code}, Reason: ${event.reason}`)
                    if (mounted) {
                        if (event.code !== 1000 && event.code !== 1005) {
                            toast.error("Voice connection lost")
                        }
                        onDisconnect()
                    }
                }

                ws.onmessage = async (event) => {
                    // 1. Handle text signals (Interruption from server)
                    if (typeof event.data === 'string') {
                        if (event.data === '__INTERRUPT__') {
                            console.log("[Interruption] Backend signal received, stopping playback")
                            playerRef.current?.clearBuffer()
                            setIsUserSpeaking(true)
                            setIsAgentSpeaking(false)
                        }
                        return
                    }

                    // 2. Handle binary audio data
                    if (event.data instanceof ArrayBuffer) {
                        const int16Data = new Int16Array(event.data)
                        // Only play if user isn't currently speaking (Double check VAD)
                        if (!isUserSpeakingRef.current) {
                            if (!isAgentSpeaking) setIsAgentSpeaking(true)
                            playerRef.current?.playChunk(int16Data)
                        }
                    }
                }

            } catch (err) {
                console.error("Voice Initialization Error:", err)
                if (mounted) {
                    setStatus("error")
                    toast.error("Voice initialization failed")
                }
            }
        }

        connect()

        return () => {
            mounted = false
            cleanup()
        }
    }, [threadId, onDisconnect])

    const cleanup = () => {
        if (socketRef.current) {
            if (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING) {
                socketRef.current.close()
            }
            socketRef.current = null
        }
        if (capturerRef.current) {
            capturerRef.current.stop()
            capturerRef.current = null
        }
        if (playerRef.current) {
            playerRef.current.stop()
            playerRef.current = null
        }
    }

    const toggleMute = () => {
        setIsMuted(!isMuted)
    }

    if (status === "error") {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-950/95 backdrop-blur-xl text-white rounded-lg border border-red-500/30 shadow-2xl w-[300px] h-[300px]">
                <p className="text-red-400 mb-4 text-center">Connection Failed</p>
                <Button onClick={onDisconnect} variant="ghost">Close</Button>
            </div>
        )
    }

    if (status === "connecting") {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-950/95 backdrop-blur-xl text-white rounded-lg border border-primary/20 shadow-2xl w-[300px] h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-slate-400">Connecting Socket...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center p-8 h-full bg-slate-950/95 backdrop-blur-xl text-white rounded-lg border border-primary/20 shadow-2xl relative transition-all duration-500 w-[300px] h-[400px]">
            <div className="flex-1 flex items-center justify-center relative w-full">
                <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full animate-pulse" />
                <div className="flex gap-1 items-center h-24">
                    {isUserSpeaking ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex gap-1 items-center">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="w-2 bg-emerald-500/80 rounded-full animate-bounce" style={{ height: `30px`, animationDelay: `${i * 0.1}s` }} />
                                ))}
                            </div>
                            <span className="text-xs text-emerald-400/80 font-mono tracking-widest mt-2 uppercase">Listening</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex gap-1 items-center h-24">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="w-2 bg-blue-400/80 rounded-full animate-bounce" style={{ height: isAgentSpeaking ? `${Math.random() * 40 + 20}px` : '4px', animationDelay: `${i * 0.1}s` }} />
                                ))}
                            </div>
                            <span className="text-xs text-blue-400/80 font-mono tracking-widest mt-2 uppercase">
                                {isAgentSpeaking ? "Speaking" : "Waiting"}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8 flex gap-4">
                <Button
                    variant={isMuted ? "destructive" : "secondary"}
                    size="icon"
                    className="rounded-full h-12 w-12"
                    onClick={toggleMute}
                >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>

                <Button
                    variant="destructive"
                    size="icon"
                    className="rounded-full h-12 w-12"
                    onClick={onDisconnect}
                >
                    <PhoneOff className="w-5 h-5" />
                </Button>
            </div>
        </div>
    )
}
