"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { MessageSquare, Bot } from "lucide-react"
import { PipecatVoiceAssistant } from "./PipecatVoiceAssistant"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { AgentActivityPanel } from "./AgentActivityPanel"
import { useChat } from "@/hooks/useChat"
import { ChatHeader } from "./ChatHeader"
import { ChatMessages } from "./ChatMessages"
import { ChatInput } from "./ChatInput"
import { useSearchParams, useRouter } from "next/navigation"

interface ChatWidgetProps {
    agentName?: string
    welcomeMessage?: string
    primaryColor?: string
    isOpenByDefault?: boolean
    mode?: "widget" | "embedded"
    capabilities?: {
        voice: boolean
        video: boolean
        knowledge: boolean
        automation: boolean
    }
    showActivityPanel?: boolean
    onThreadChange?: (threadId: string) => void
    onThinkingChange?: (isThinking: boolean) => void
    onClose?: () => void
    workflowId?: string
    agentId?: string
    title?: string
    description?: string
    publicMode?: boolean
}

export function ChatWidget({
    agentName = "GRID AI Assistant",
    welcomeMessage = "GRID established. How can I assist with your grid operations today?",
    primaryColor = "#0070AD",
    isOpenByDefault = false,
    mode = "widget",
    showActivityPanel = false,
    onThreadChange,
    onThinkingChange,
    onClose,
    workflowId: initialWorkflowId,
    agentId: initialAgentId,
    capabilities: providedCapabilities,
    publicMode = false
}: ChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(isOpenByDefault)
    const [isExpanded, setIsExpanded] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [callMode, setCallMode] = useState<"audio" | "video" | null>(null)
    const [isHandoffInProgress, setIsHandoffInProgress] = useState(false)
    const capabilities = providedCapabilities || { voice: publicMode, video: false, knowledge: true, automation: true }
    const scrollRef = useRef<HTMLDivElement>(null)

    const {
        messages,
        isThinking,
        inputValue,
        setInputValue,
        handleSend,
        resetSession,
        finishConversation,
        agentEvents,
        currentAgent,
        threadId
    } = useChat({
        welcomeMessage,
        workflowId: initialWorkflowId,
        agentId: initialAgentId,
        onThreadChange,
        onThinkingChange,
        isOpen,
        isPublic: publicMode
    })

    // Handle Context Handoff from Public Agent
    const searchParams = useSearchParams()
    const router = useRouter()
    const effectRan = useRef(false)

    useEffect(() => {
        if (!mounted || effectRan.current || !handleSend) return

        const intent = searchParams.get('intent')
        const description = searchParams.get('description')

        if (intent === 'create_ticket' && description) {
            effectRan.current = true
            setIsHandoffInProgress(true)

            setIsOpen(true)

            // Artificial delay to ensure session and socket initialization
            // We wait slightly longer to be sure useChat initialized its thread
            const timer = setTimeout(() => {
                const msg = `Issue detected in public portal: ${description}`
                handleSend(msg)
                setIsHandoffInProgress(false)
                // Clear the URL to avoid re-triggering on refresh
                router.replace('/admin/chatbot', { scroll: false })
            }, 3000)

            return () => clearTimeout(timer)
        }
    }, [searchParams, router, handleSend, mounted])

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isThinking])

    const handleDisconnect = useCallback(() => {
        setCallMode(null)
    }, [])

    const startCall = (mode: "audio" | "video") => {
        setCallMode(mode)
        toast.success(`Connecting to Neural ${mode === 'audio' ? 'Voice' : 'Video'} Interface...`)
    }

    if (!mounted) return null

    if (mode === "embedded") {
        return (
            <div className="w-full h-full flex flex-col bg-card rounded-lg shadow-2xl border border-border overflow-hidden relative group">
                <ChatHeader
                    agentName={agentName}
                    primaryColor={primaryColor}
                    variant="embedded"
                    onReset={resetSession}
                    onFinish={finishConversation}
                    onClose={() => { }}
                />

                <div className="flex-1 flex flex-col min-h-0 relative bg-background/50">
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar relative z-10">
                        <ChatMessages
                            messages={messages}
                            isThinking={isThinking}
                            primaryColor={primaryColor}
                            variant="embedded"
                            onActionClick={(label) => handleSend(label)}
                        />
                    </div>

                    {/* Diagnostic panel removed */}

                    <div className="p-6 bg-card backdrop-blur-xl border-t border-border shrink-0 z-10">
                        {(messages.length === 1 && messages[0].id === "1") && !isHandoffInProgress ? ( // Check if only welcome message
                            <div className="flex flex-col items-center py-8 gap-6 max-w-md mx-auto">
                                <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 animate-pulse">
                                    <Bot className="h-8 w-8 text-primary" />
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-sm font-bold text-foreground uppercase tracking-[0.2em]">GRID Ready</p>
                                    <p className="text-xs text-muted-foreground max-w-[200px]">Secure channel ready for multi-agent coordination.</p>
                                </div>
                                <Button
                                    onClick={() => handleSend("Hello")}
                                    className="w-full h-12 font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95 text-white rounded-lg"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <Bot className="mr-2 h-5 w-5" /> Start Conversation
                                </Button>
                            </div>
                        ) : (
                            <ChatInput
                                value={inputValue}
                                onChange={setInputValue}
                                onSend={() => handleSend()}
                                primaryColor={primaryColor}
                                variant="embedded"
                            />
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={cn(
            "fixed z-[9999] flex flex-col items-end font-sans transition-all duration-500 pointer-events-none",
            (isOpen && isExpanded) ? "inset-0 items-center justify-center p-6 bg-black/20 backdrop-blur-sm" : "bottom-6 right-6"
        )}>
            <div className={cn(
                "bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-border flex flex-col overflow-hidden transition-all duration-500 pointer-events-auto",
                isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-10 pointer-events-none",
                isOpen && isExpanded ? "w-full max-w-4xl h-full max-h-[800px]" : "w-[400px] h-[600px] mb-4 origin-bottom-right"
            )}>
                <ChatHeader
                    agentName={agentName}
                    primaryColor={primaryColor}
                    variant="widget"
                    isExpanded={isExpanded}
                    onExpandToggle={() => setIsExpanded(!isExpanded)}
                    onReset={resetSession}
                    onFinish={finishConversation}
                    onCallStart={startCall}
                    onClose={() => { setIsOpen(false); setIsExpanded(false); onClose?.(); }}
                    capabilities={capabilities}
                    callMode={callMode}
                />

                <div className="flex-1 flex flex-col min-h-0 relative">
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar scrolling-touch">
                        <ChatMessages
                            messages={messages}
                            isThinking={isThinking}
                            primaryColor={primaryColor}
                            variant="widget"
                            onActionClick={(label) => handleSend(label)}
                        />
                        {callMode && (
                            <div className="animate-in fade-in zoom-in duration-300 z-50 absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
                                <PipecatVoiceAssistant
                                    threadId={threadId}
                                    onDisconnect={handleDisconnect}
                                />
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-background border-t border-border shrink-0">
                        {(messages.length === 1 && messages[0].id === "1") && !isHandoffInProgress && !callMode ? (
                            <div className="flex flex-col items-center py-4 gap-4">
                                <p className="text-sm text-muted-foreground font-medium">Ready to assist.</p>
                                <Button
                                    onClick={() => handleSend("Hello")}
                                    className="w-full h-12 font-bold uppercase tracking-widest shadow-lg text-white"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <Bot className="mr-2 h-5 w-5" /> Start Conversation
                                </Button>
                            </div>
                        ) : (
                            <ChatInput
                                value={inputValue}
                                onChange={setInputValue}
                                onSend={() => handleSend()}
                                primaryColor={primaryColor}
                                variant="widget"
                            />
                        )}
                    </div>
                </div>
            </div>

            <div className={cn(
                "transition-all duration-500 pointer-events-auto",
                isExpanded ? "fixed bottom-6 right-6" : ""
            )}>
                {!isOpen && (
                    <button
                        onClick={() => setIsOpen(true)}
                        className="group relative h-16 w-16 rounded-lg text-white shadow-2xl transition-all duration-300 active:scale-90 flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <MessageSquare className="h-7 w-7 transition-all duration-500 rotate-0 group-hover:-rotate-12 group-hover:scale-110" />
                        <div className="absolute top-0 right-0 p-1">
                            <div className="h-3 w-3 rounded-lg bg-emerald-500 ring-4 ring-white shadow-md animate-pulse" />
                        </div>
                    </button>
                )}

                {isOpen && !isExpanded && (
                    <button
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-0 hover:gap-3 bg-white dark:bg-slate-900 text-foreground p-0 px-0 hover:p-4 hover:px-6 rounded-lg hover:rounded-lg shadow-xl border border-border transition-all duration-300 active:scale-95 group overflow-hidden"
                    >
                        <span className="text-sm font-bold uppercase tracking-widest text-primary w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-300 whitespace-nowrap">Neural Assistant</span>
                        <div className="h-12 w-12 rounded-lg group-hover:rounded-lg bg-primary text-white flex items-center justify-center shadow-md group-hover:rotate-12 transition-all duration-300 shrink-0">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                    </button>
                )}
            </div>
        </div>
    )
}
