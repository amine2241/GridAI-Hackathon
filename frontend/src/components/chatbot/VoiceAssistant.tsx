"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useTracks,
    useParticipants,
    BarVisualizer,
} from "@livekit/components-react"
import { Track } from "livekit-client"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, PhoneOff, Loader2, Cpu } from "lucide-react"
import "@livekit/components-styles"
import { cn } from "@/lib/utils"

interface VoiceAssistantProps {
    serverUrl: string
    token: string
    onDisconnect: () => void
    video?: boolean
    minimal?: boolean
}

export function VoiceAssistant({ serverUrl, token, onDisconnect, video = false, minimal = false }: VoiceAssistantProps) {
    return (
        <LiveKitRoom
            serverUrl={serverUrl}
            token={token}
            connect={true}
            audio={true}
            video={video}
            onDisconnected={onDisconnect}
            className={cn(
                "flex flex-col items-center justify-center p-8 h-full bg-slate-950/95 backdrop-blur-xl text-white rounded-lg border border-primary/20 shadow-2xl overflow-hidden relative transition-all duration-500",
                minimal ? "p-4 h-24 flex-row justify-between gap-4 bg-slate-900/95 border-b border-white/5 rounded-none" : "gap-6"
            )}
        >
            {/* Ambient Background - Hidden in minimal */}
            {!minimal && (
                <>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-slate-950/50 to-slate-950 pointer-events-none" />
                    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10 pointer-events-none" />
                </>
            )}

            <AssistantContent onDisconnect={onDisconnect} />
            <RoomAudioRenderer volume={1.0} />
            {/* Manual Audio Element Fallback (Hidden) inside AssistantContent is better, but here works too if ref passed? No. */}
        </LiveKitRoom>
    )
}

function AssistantContent({ onDisconnect }: { onDisconnect: () => void }) {
    // ... hooks ...
    // render:
    // Standard Hook replacement for manual agent
    const participants = useParticipants();
    const agentParticipant = participants.find(p => p.identity === 'agent-001' || p.identity.includes('agent'));

    const audioTrackRef = useTracks([Track.Source.Microphone]).find(
        (ref) => ref.participant.identity === agentParticipant?.identity
    );

    // Fallback state logic
    const state = agentParticipant ? (audioTrackRef ? 'speaking' : 'listening') : 'connecting';
    const audioTrack = audioTrackRef?.publication?.track as unknown;

    const [isMuted, setIsMuted] = useState(false)
    const [duration, setDuration] = useState(0)

    const audioElRef = useRef<HTMLAudioElement>(null)

    useEffect(() => {
        const audioEl = audioElRef.current;
        if (audioTrack && audioEl) {
            console.log("Attaching audio track manually...")
            const track = audioTrack as { attach: (el: HTMLAudioElement) => void; detach: (el: HTMLAudioElement) => void }
            track.attach(audioEl)
            audioEl.play().catch(e => console.error("Auto-play failed:", e))
            return () => {
                track.detach(audioEl)
            }
        }
    }, [audioTrack])

    useEffect(() => {
        const timer = setInterval(() => setDuration(d => d + 1), 1000)
        return () => clearInterval(timer)
    }, [])

    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60)
        const s = secs % 60
        return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    const toggleMute = useCallback(() => {
        setIsMuted((prev) => !prev)
    }, [])

    return (
        <div className="flex flex-col items-center gap-8 w-full z-10">
            {/* Header Status */}
            <div className="flex items-center gap-2 text-primary/80 bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10 backdrop-blur-md">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{state === 'speaking' ? 'Agent_Transmitting' : 'Neural_Link_Active'}</span>
                <div className="w-px h-3 bg-primary/20 mx-2" />
                <span className="text-[10px] font-mono opacity-70">{formatTime(duration)}</span>
            </div>

            {/* Main Visualizer Orb */}
            <div className="relative h-48 w-48 flex items-center justify-center">
                {/* Outer Rings */}
                <div className={cn("absolute inset-0 rounded-full border border-primary/20", state === "speaking" ? "animate-[spin_4s_linear_infinite]" : "opacity-30")} />
                <div className={cn("absolute inset-2 rounded-full border border-primary/20 border-dashed", state === "speaking" ? "animate-[spin_8s_linear_infinite_reverse]" : "opacity-30")} />

                {/* Core Glow */}
                <div className={cn(
                    "absolute inset-0 rounded-full bg-primary/5 blur-3xl transition-opacity duration-500",
                    state === "speaking" ? "opacity-100" : "opacity-30"
                )} />

                {/* Central Avatar */}
                <div className={cn(
                    "h-32 w-32 rounded-full bg-slate-900 flex items-center justify-center border-2 shadow-[0_0_30px_rgba(0,112,173,0.3)] transition-all duration-500 relative overflow-hidden",
                    state === "speaking" ? "border-primary scale-105" : "border-slate-700 scale-100"
                )}>
                    <div className="absolute inset-0 bg-primary/10 animate-pulse" />
                    {state === 'connecting' ? (
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    ) : (
                        <Cpu className={cn(
                            "h-12 w-12 transition-colors duration-300 relative z-10",
                            state === 'speaking' ? 'text-primary' : 'text-slate-500'
                        )} />
                    )}
                </div>
            </div>

            {/* Debug Overlay - Temporary */}
            <div className="absolute top-2 left-2 p-2 bg-black/80 text-[10px] font-mono text-green-400 rounded z-50 pointer-events-none max-w-[200px] overflow-hidden opacity-50">
                <div>Room: {state}</div>
                <div>Participants: {participants.length}</div>
                {participants.map(p => (
                    <div key={p.identity}>{p.identity}: {p.getTrackPublication(Track.Source.Microphone) ? "MIC" : "NO_MIC"}</div>
                ))}
            </div>

            {/* Status Text & Waveform */}
            <div className="text-center space-y-4 w-full max-w-xs">
                <div>
                    <h3 className="text-2xl font-black tracking-tight text-white mb-1">
                        {state === "speaking" ? "AI Speaking" : "Connected"}
                    </h3>
                    <p className="text-xs text-primary/60 uppercase tracking-widest font-bold animate-pulse">
                        Voice Channel Secure
                    </p>
                </div>

                <div className="h-16 flex items-center justify-center px-4 bg-slate-900/50 rounded-lg border border-white/5 backdrop-blur-sm shadow-inner">
                    <BarVisualizer
                        state={state as "connecting" | "listening" | "speaking"}
                        barCount={20}
                        trackRef={audioTrackRef}
                        className="w-full h-8"
                        style={{ height: '32px' }}
                    />
                </div>
            </div>

            {/* Hidden Audio Element for Manual Attachment */}
            <audio ref={audioElRef} autoPlay style={{ display: 'none' }} />

            {/* Controls */}
            <div className="flex items-center gap-6 mt-4">
                <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                        "h-16 w-16 rounded-full border-2 transition-all duration-300 backdrop-blur-md",
                        isMuted
                            ? "bg-rose-500/10 border-rose-500/50 text-rose-500 hover:bg-rose-500/20"
                            : "bg-slate-800/50 border-slate-700 text-white hover:border-primary/50 hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_20px_rgba(0,112,173,0.3)]"
                    )}
                    onClick={toggleMute}
                >
                    {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>

                <Button
                    variant="destructive"
                    size="icon"
                    className="h-16 w-16 rounded-full shadow-[0_0_30px_rgba(225,29,72,0.4)] hover:shadow-[0_0_50px_rgba(225,29,72,0.6)] bg-rose-600 hover:bg-rose-500 hover:scale-105 transition-all duration-300 border-4 border-slate-950"
                    onClick={onDisconnect}
                >
                    <PhoneOff className="h-8 w-8" />
                </Button>
            </div>
        </div>
    )
}
