"use client"

import { motion, AnimatePresence } from "framer-motion"
import {
    Cpu,
    Database,
    MessageSquare,
    Terminal,
    CheckCircle2,
    Loader2,
    Zap,
    AlertCircle,
    Server,
    Globe,
    Ticket,
    ArrowRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState, useRef } from "react"

export interface AgentEvent {
    type: "agent_active" | "tool_call" | "rag_retrieval"
    data: {
        agent?: string
        message?: string
        tool?: string
        status?: 'started' | 'completed' | 'failed'
        input?: Record<string, unknown> | string | number | boolean | null
        output?: Record<string, unknown> | string | number | boolean | null
        error?: string
    }
    timestamp: number
}

interface AgentActivityPanelProps {
    events: AgentEvent[]
    currentAgent: string | null
    isThinking: boolean
    variant?: "widget" | "full"
}

export function AgentActivityPanel({ events, currentAgent, isThinking, variant = "widget" }: AgentActivityPanelProps) {
    const [activeStage, setActiveStage] = useState<string>("idle")
    const scrollRef = useRef<HTMLDivElement>(null)

    // Auto-scroll log
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [events, isThinking])

    useEffect(() => {
        if (currentAgent) {
            setActiveStage(currentAgent)
        } else if (!isThinking) {
            const timer = setTimeout(() => {
                setActiveStage("idle")
            }, 1500)
            return () => clearTimeout(timer)
        }
    }, [currentAgent, isThinking])

    const toolEvents = events.filter(e => e.type === "tool_call" || e.type === "agent_active").slice(variant === "full" ? -50 : -5)

    const getStatusText = () => {
        if (isThinking) {
            if (activeStage === "support" || activeStage === "supervisor") return "ANALYZING INTENT & DELEGATING..."
            if (activeStage === "rag") return "RETRIEVING KNOWLEDGE..."
            if (activeStage === "ticket") return "CREATING INCIDENT TICKET..."
            if (activeStage === "analyze") return "EXECUTING DIAGNOSTICS..."
            return `PROCESSING REQUEST...`
        }
        if (activeStage !== "idle" && toolEvents.length > 0) return "OPERATION COMPLETE"
        return "SYSTEM READY - AWAITING INPUT"
    }

    if (variant === "full") {
        return (
            <ActivityFull
                toolEvents={toolEvents}
                activeStage={activeStage}
                isThinking={isThinking}
                getStatusText={getStatusText}
                scrollRef={scrollRef}
            />
        )
    }

    return (
        <ActivityWidget
            events={events}
            toolEvents={toolEvents}
            activeStage={activeStage}
            isThinking={isThinking}
            getStatusText={getStatusText}
        />
    )
}

// --- Sub-components for Full Variant ---

interface ActivityFullProps {
    toolEvents: AgentEvent[]
    activeStage: string
    isThinking: boolean
    getStatusText: () => string
    scrollRef: React.RefObject<HTMLDivElement>
}

function ActivityFull({ toolEvents, activeStage, isThinking, getStatusText, scrollRef }: ActivityFullProps) {
    return (
        <div className="w-full h-full flex flex-col font-mono text-xs text-muted-foreground select-none bg-background p-6 gap-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }}
            />

            {/* Status Bar */}
            <div className="flex items-center justify-between p-5 bg-card/50 border border-border rounded-lg backdrop-blur-xl relative z-10 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-purple-500/5 rounded-lg" />

                <div className="flex items-center gap-4 relative z-10">
                    <div className="relative">
                        {isThinking && (
                            <>
                                <div className="h-4 w-4 rounded-full bg-emerald-400 animate-ping absolute inset-0 opacity-75" />
                                <motion.div
                                    className="h-4 w-4 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] relative z-10"
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                            </>
                        )}
                        {!isThinking && <div className="h-4 w-4 rounded-full bg-muted shadow-inner relative z-10" />}
                    </div>
                    <span className="font-bold tracking-[0.2em] uppercase text-sm bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        {getStatusText()}
                    </span>
                </div>
                <div />
            </div>

            {/* Main Visualization Area */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
                <div className="lg:col-span-2 bg-gradient-to-br from-slate-900/50 via-slate-900/30 to-slate-800/50 border border-slate-700/50 backdrop-blur-xl rounded-lg relative overflow-hidden group shadow-2xl">
                    <VisualizationDesign />
                    <div className="relative w-full h-full p-16 flex items-center justify-center">
                        <div className="relative grid grid-cols-4 gap-x-24 gap-y-16 items-center justify-items-center w-full max-w-6xl">
                            <AgentNodeWrapper id="rag" label="KNOWLEDGE" subtitle="Retrieving" icon={Database} activeStage={activeStage} size="lg" />
                            <div className="absolute left-1/2 top-[25%] -translate-x-1/2 h-20 w-[3px] z-10">
                                <ConnectionLine isActive={activeStage === "rag" && isThinking} direction="vertical" />
                            </div>
                            <AgentNodeWrapper id="ticket" label="ACTION" subtitle="Executing" icon={Ticket} activeStage={activeStage} size="lg" />
                            <div className="absolute left-[20%] top-[50%] w-[20%] h-[3px] z-10">
                                <ConnectionLine isActive={activeStage === "ticket" && isThinking} />
                            </div>
                            <AgentNodeWrapper id="support" label="INTENT" subtitle="Supervisor" icon={MessageSquare} activeStage={activeStage} size="lg" />
                            <div className="absolute right-[20%] top-[50%] w-[20%] h-[3px] z-10">
                                <ConnectionLine isActive={activeStage === "analyze" && isThinking} />
                            </div>
                            <AgentNodeWrapper id="analyze" label="DIAGNOSTIC" subtitle="Processing" icon={Zap} activeStage={activeStage} size="lg" />
                        </div>
                    </div>
                </div>

                <div className="bg-card/50 border border-border backdrop-blur-xl rounded-lg flex flex-col overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-border bg-muted/30 backdrop-blur-sm flex items-center justify-between">
                        <div className="flex items-center gap-3 text-primary">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                                <Terminal className="h-4 w-4" />
                            </motion.div>
                            <span className="font-bold tracking-widest uppercase text-[10px] text-foreground">Neural Telemetry Log</span>
                        </div>
                        <motion.div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]" animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar" ref={scrollRef}>
                        <AnimatePresence mode="popLayout">
                            {toolEvents.map((event, i) => (
                                <EventItem key={`${event.timestamp}-${i}`} event={event} />
                            ))}
                            {isThinking && <LoaderItem text="Processing next sequence..." />}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- Sub-components for Widget Variant ---

interface ActivityWidgetProps {
    events: AgentEvent[]
    toolEvents: AgentEvent[]
    activeStage: string
    isThinking: boolean
    getStatusText: () => string
}

function ActivityWidget({ events, toolEvents, activeStage, isThinking, getStatusText }: ActivityWidgetProps) {
    return (
        <div className="w-full bg-background/95 backdrop-blur-xl border-t border-border p-4 font-mono text-xs text-muted-foreground select-none overflow-hidden pb-12">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", isThinking ? "bg-primary animate-pulse" : "bg-muted")} />
                    <span className="font-bold tracking-widest uppercase text-foreground">{getStatusText()}</span>
                </div>
                <div />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative h-32 bg-muted/30 rounded-lg border border-border p-4 flex items-center justify-between px-8 overflow-hidden">
                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

                    <AgentNodeWrapper id="support" label="INTENT" icon={MessageSquare} activeStage={activeStage} />
                    <ConnectionLine isActive={["rag", "ticket", "analyze"].includes(activeStage)} />
                    <AgentNodeWrapper id="rag" label="KNOWLEDGE" icon={Database} activeStage={activeStage} />
                    <div className="absolute left-[40%] top-1/2 -translate-y-1/2 h-16 w-px bg-border" />
                    <AgentNodeWrapper id="ticket" label="ACTION" icon={Ticket} activeStage={activeStage} />
                    <ConnectionLine isActive={activeStage === "analyze"} />
                    <AgentNodeWrapper id="analyze" label="DIAGNOSTIC" icon={Zap} activeStage={activeStage} />
                </div>

                <div className="h-32 bg-muted/20 rounded-lg border border-border p-3 overflow-y-auto space-y-2 no-scrollbar">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 sticky top-0 bg-background/90 backdrop-blur-sm pb-1 border-b border-border">
                        System Event Log
                    </div>
                    <AnimatePresence mode="popLayout">
                        {toolEvents.length === 0 && isThinking && <LoaderItem text="Initializing sequence..." />}
                        {[...events].reverse().map((event, i) => (
                            <MiniEventItem key={event.timestamp + i} event={event} />
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}

// --- Common UI Components ---

interface MetricItemProps {
    icon: React.ElementType
    label: string
    value: string
    color: "blue" | "purple" | "cyan"
    valueColor?: string
}

function MetricItem({ icon: Icon, label, value, color, valueColor }: MetricItemProps) {
    const colorMap: Record<string, string> = {
        blue: "text-blue-400 bg-blue-500/10 border-blue-500/20 group-hover:bg-blue-500/20",
        purple: "text-purple-400 bg-purple-500/10 border-purple-500/20 group-hover:bg-purple-500/20",
        cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 group-hover:bg-cyan-500/20"
    }
    return (
        <span className="flex items-center gap-2.5 group transition-colors">
            <div className={cn("p-1.5 rounded-lg border transition-colors", colorMap[color])}>
                <Icon className="h-4 w-4" />
            </div>
            <span>{label}: <span className={cn("font-mono", valueColor ? `text-${valueColor}-400` : colorMap[color].split(' ')[0])}>{value}</span></span>
        </span>
    )
}

function LoaderItem({ text }: { text: string }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-slate-500 italic p-2 border border-dashed border-slate-800 rounded-lg">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{text}</span>
        </motion.div>
    )
}

function VisualizationDesign() {
    return (
        <>
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-purple-400/20 to-transparent" />
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent" />
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(15)].map((_, i) => (
                    <motion.div key={i} className="absolute h-1 w-1 rounded-full bg-emerald-400/30" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }} animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2], scale: [1, 1.5, 1] }} transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }} />
                ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <motion.div className="h-72 w-72 rounded-full border border-emerald-400/40 shadow-[0_0_50px_rgba(16,185,129,0.15)]" animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
                <motion.div className="absolute h-96 w-96 rounded-full border-2 border-blue-400/20 border-dashed shadow-[0_0_80px_rgba(59,130,246,0.1)]" animate={{ rotate: -360 }} transition={{ duration: 45, repeat: Infinity, ease: "linear" }} />
                <motion.div className="absolute h-52 w-52 rounded-full border border-purple-400/30" animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
            </div>
        </>
    )
}

function MiniEventItem({ event }: { event: AgentEvent }) {
    return (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-3 p-2 rounded bg-muted/40 border border-border text-[11px]">
            <EventIcon type={event.type} data={event.data} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground uppercase truncate">{getEventTitle(event)}</span>
                    <span className="text-[9px] text-muted-foreground font-mono">{new Date(event.timestamp * 1000).toLocaleTimeString([], { hour12: false, formatMatcher: 'basic' }).split(' ')[0]}</span>
                </div>
                <div className="text-muted-foreground mt-0.5 truncate">{getEventDetail(event)}</div>
            </div>
        </motion.div>
    )
}

function EventItem({ event }: { event: AgentEvent }) {
    if (event.type === 'agent_active') {
        const isHandoff = event.data.message?.includes("Handing off")
        return (
            <motion.div className="flex gap-4 group" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div className="flex flex-col items-center">
                    <motion.div className="h-2 w-2 rounded-full bg-primary ring-4 ring-primary/20" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                    <div className="w-[2px] flex-1 bg-gradient-to-b from-primary/30 to-transparent group-last:hidden mt-2" />
                </div>
                <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                            {event.data.agent} {isHandoff ? "(HANDOFF)" : "(ACTIVE)"}
                        </span>
                        <span className="text-[9px] text-muted-foreground font-mono">{new Date(event.timestamp * 1000).toLocaleTimeString()}</span>
                    </div>
                    <div className="p-3 bg-muted/30 border border-border rounded-lg text-foreground text-[11px] leading-relaxed">{event.data.message}</div>
                </div>
            </motion.div>
        )
    }

    if (event.type === 'tool_call') {
        const isError = event.data.status === 'failed'
        const isSuccess = event.data.status === 'completed'
        const isStarted = event.data.status === 'started'
        return (
            <motion.div className="flex gap-4 group" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div className="flex flex-col items-center">
                    <motion.div className={cn("h-2 w-2 rounded-full ring-4", isError ? "bg-red-500 ring-red-500/20" : isSuccess ? "bg-emerald-500 ring-emerald-500/20" : "bg-amber-500 ring-amber-500/20")} animate={isStarted ? { scale: [1, 1.3, 1] } : {}} transition={isStarted ? { duration: 1.5, repeat: Infinity } : {}} />
                    <div className="w-[2px] flex-1 bg-gradient-to-b from-amber-500/30 to-transparent group-last:hidden mt-2" />
                </div>
                <div className="flex-1 pb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-2 border", isError ? "bg-red-500/10 text-red-400 border-red-500/20" : isSuccess ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20")}>
                            <Terminal className="h-3 w-3" />
                            {event.data.tool}
                        </span>
                        <span className="text-[9px] text-slate-600 font-mono">{isStarted ? "EXECUTING..." : isSuccess ? "SUCCESS" : "FAILED"}</span>
                    </div>
                    {event.data.input && <CodeBox label="Input" data={event.data.input} />}
                    {(isSuccess || isError) && <div className="flex items-center gap-2 my-2 pl-4 opacity-70"><ArrowRight className="h-3 w-3 text-muted-foreground" /></div>}
                    {isStarted ? <LoaderItem text="Processing..." /> : <CodeBox label={isSuccess ? "Output" : "Error"} data={event.data.output || event.data.error} color={isSuccess ? "emerald" : "red"} />}
                </div>
            </motion.div>
        )
    }
    return null
}

function CodeBox({ label, data, color = "slate" }: { label: string, data: unknown, color?: "slate" | "emerald" | "red" }) {
    const colorClasses: Record<string, string> = {
        slate: "bg-muted/40 border-border text-muted-foreground",
        emerald: "bg-emerald-500/5 border-emerald-500/30 text-emerald-600",
        red: "bg-red-500/5 border-red-500/30 text-red-600"
    }
    return (
        <motion.div className="relative mb-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="absolute left-3 top-[-6px] px-1 bg-background text-[9px] font-bold text-muted-foreground uppercase">{label}</div>
            <div className={cn("p-3 border border-dashed rounded-lg font-mono text-[11px] overflow-x-auto", colorClasses[color])}>
                <pre>{typeof data === 'string' ? data : JSON.stringify(data, null, 2)}</pre>
            </div>
        </motion.div>
    )
}

interface AgentNodeWrapperProps {
    id: string
    label: string
    subtitle?: string
    icon: React.ElementType
    activeStage: string
    size?: "md" | "lg"
}

function AgentNodeWrapper({ id, label, subtitle, icon, activeStage, size = "md" }: AgentNodeWrapperProps) {
    return (
        <AgentNode
            label={label}
            subtitle={subtitle}
            icon={icon}
            isActive={activeStage === id || (id === "support" && activeStage === "supervisor")}
            isCompleted={
                (id === "support" && ["rag", "ticket", "analyze"].includes(activeStage)) ||
                (id === "ticket" && activeStage === "analyze")
            }
            size={size}
        />
    )
}

interface AgentNodeProps {
    label: string
    subtitle?: string
    icon: React.ElementType
    isActive: boolean
    isCompleted: boolean
    size?: "md" | "lg"
}

function AgentNode({ label, subtitle, icon: Icon, isActive, isCompleted, size = "md" }: AgentNodeProps) {
    return (
        <motion.div className="relative z-10 flex flex-col items-center gap-2" animate={{ scale: isActive ? 1.08 : isCompleted ? 1 : 0.95, opacity: isActive ? 1 : isCompleted ? 0.8 : 0.5 }} transition={{ duration: 0.5, ease: "easeOut" }}>
            <motion.div className={cn("rounded-lg flex items-center justify-center border-2 shadow-sm backdrop-blur-sm relative overflow-hidden", size === "lg" ? "h-24 w-24 border-[3px]" : "h-12 w-12", isActive ? "bg-primary/5 border-primary shadow-[0_0_20px_rgba(var(--primary),0.2)] text-primary" : isCompleted ? "bg-blue-500/5 border-blue-500 shadow-sm text-blue-500" : "bg-muted/50 border-border text-muted-foreground")} animate={{ boxShadow: isActive ? ["0 0 10px rgba(var(--primary), 0.1)", "0 0 20px rgba(var(--primary), 0.2)", "0 0 10px rgba(var(--primary), 0.1)"] : "0 0 0px rgba(0, 0, 0, 0)" }} transition={{ duration: 1.5, repeat: isActive ? Infinity : 0 }}>
                {isActive && <div className="absolute inset-0 bg-primary/5 animate-pulse" />}
                <motion.div className="relative z-10" animate={{ rotate: isActive ? [0, 3, -3, 0] : 0, scale: isActive ? [1, 1.05, 1] : 1 }} transition={{ repeat: isActive ? Infinity : 0, duration: 2.5, ease: "easeInOut" }}>
                    <Icon className={size === "lg" ? "h-11 w-11" : "h-6 w-6"} strokeWidth={2.5} />
                </motion.div>
                {isActive && (
                    <>
                        <motion.span className="absolute inset-0 rounded-lg border-2 border-primary" animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0, 0.8] }} transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }} />
                        <motion.span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-primary shadow-sm" animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} />
                    </>
                )}
                {isCompleted && (
                    <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="absolute -bottom-1.5 -right-1.5 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    </motion.div>
                )}
            </motion.div>
            <div className="flex flex-col items-center gap-0.5">
                <span className={cn("text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300", isActive ? "text-primary font-bold" : isCompleted ? "text-blue-500 font-bold" : "text-muted-foreground")}>{label}</span>
                {subtitle && <span className={cn("text-[8px] font-bold uppercase tracking-wider transition-all duration-300 italic", isActive ? "text-primary/70" : "text-muted-foreground/60")}>{subtitle}</span>}
            </div>
        </motion.div>
    )
}

function ConnectionLine({ isActive, direction = "horizontal" }: { isActive: boolean; direction?: string }) {
    const isVertical = direction === "vertical"
    return (
        <div className={cn("relative overflow-hidden bg-border rounded-full", isVertical ? "w-[3px] h-24" : "flex-1 h-[3px] mx-3")}>
            <AnimatePresence>
                {isActive && (
                    <>
                        <motion.div
                            className={cn("absolute inset-0 bg-gradient-to-r from-primary/40 via-primary to-primary/40 shadow-sm", isVertical && "bg-gradient-to-b")}
                            initial={isVertical ? { y: "-100%" } : { x: "-100%" }}
                            animate={isVertical ? { y: "100%" } : { x: "100%" }}
                            exit={isVertical ? { y: "100%", opacity: 0 } : { x: "100%", opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", repeatDelay: 0.3 }}
                        />
                        <div className="absolute inset-0 bg-primary/10 blur-[2px]" />
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

function EventIcon({ type, data }: { type: string, data: AgentEvent['data'] }) {
    if (type === "agent_active") return <Cpu className="h-4 w-4 text-blue-400" />
    if (type === "tool_call" && data.tool) {
        if (data.status === "failed") return <AlertCircle className="h-4 w-4 text-red-500" />
        const toolIcons: Record<string, React.ReactNode> = {
            search_kb: <Database className="h-4 w-4 text-amber-400" />,
            web_search: <Globe className="h-4 w-4 text-cyan-400" />,
            submit_ticket: <Ticket className="h-4 w-4 text-purple-400" />,
            servicenow_sync: <Server className="h-4 w-4 text-pink-400" />
        }
        return toolIcons[data.tool] || <Terminal className="h-4 w-4 text-slate-400" />
    }
    return <CheckCircle2 className="h-4 w-4 text-slate-400" />
}

function getEventTitle(event: AgentEvent) {
    if (event.type === "agent_active") return `Agent: ${event.data.agent}`
    if (event.type === "tool_call") return `Tool: ${event.data.tool}`
    return "System Event"
}

function getEventDetail(event: AgentEvent) {
    if (event.type === "agent_active") return event.data.message
    if (event.type === "tool_call") {
        if (event.data.status === "started") {
            return event.data.input ? `Input: ${JSON.stringify(event.data.input).slice(0, 40)}...` : "Started execution..."
        }
        return event.data.status === "completed" ? "Completed successfully" : `Failed: ${event.data.error}`
    }
    return ""
}
