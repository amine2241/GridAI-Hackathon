import { useState, useRef, useEffect, useCallback } from "react"
import { API_BASE_URL } from "@/lib/config"
import { getAuthToken } from "@/lib/utils"
import { toast } from "sonner"
import { CheckCircle2, RefreshCw } from "lucide-react"

export interface Message {
    id: string
    text: string
    sender: "user" | "bot"
    timestamp: Date
    actions?: { label: string; icon: React.ElementType; variant?: "default" | "outline" | "secondary" }[]
}

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

export function useChat(params: {
    welcomeMessage: string
    workflowId?: string
    agentId?: string
    onThreadChange?: (threadId: string) => void
    onThinkingChange?: (isThinking: boolean) => void
    isOpen: boolean
    isPublic?: boolean
}) {
    const { welcomeMessage, workflowId, agentId, onThreadChange, onThinkingChange, isOpen, isPublic = false } = params

    const [messages, setMessages] = useState<Message[]>([])
    const [isThinking, setIsThinking] = useState(false)
    const [threadId, setThreadId] = useState<string>("")
    const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([])
    const [currentAgent, setCurrentAgent] = useState<string | null>(null)
    const [inputValue, setInputValue] = useState("")

    const storageKey = isPublic
        ? "aicp_public_thread_id"
        : (agentId ? `aicp_agent_${agentId}_thread_id` : "aicp_thread_id");

    const fetchHistory = useCallback(async (tid: string) => {
        try {
            const token = getAuthToken()
            const res = await fetch(`${API_BASE_URL}/chat/history/${tid}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            })
            if (res.ok) {
                const data = await res.json()
                console.log("History loaded:", data.messages?.length || 0, "messages")
                if (data.messages && data.messages.length > 0) {
                    const loadedParams = data.messages.map((m: { text: string; sender: "user" | "bot" }, i: number) => ({
                        id: `hist-${i}`,
                        text: m.text,
                        sender: m.sender,
                        timestamp: new Date()
                    }))
                    setMessages(loadedParams)
                }
            }
        } catch (e) {
            console.error("Failed to load history", e)
        }
    }, [])

    const resetSession = useCallback(() => {
        setMessages([
            {
                id: "welcome",
                text: welcomeMessage,
                sender: "bot",
                timestamp: new Date(),
                actions: [
                    { label: "Check System Health", icon: CheckCircle2 },
                    { label: "View Active Incidents", icon: RefreshCw }
                ]
            }
        ])
        localStorage.removeItem(storageKey)
        const newThreadId = `user-thread-${Date.now()}`
        localStorage.setItem(storageKey, newThreadId)
        setThreadId(newThreadId)
        if (onThreadChange) onThreadChange(newThreadId)
    }, [welcomeMessage, onThreadChange, storageKey])

    // Initial setup
    useEffect(() => {
        if (messages.length > 0) return // Only run once

        let storedThreadId = localStorage.getItem(storageKey)
        if (!storedThreadId) {
            storedThreadId = `user-thread-${Date.now()}`
            localStorage.setItem(storageKey, storedThreadId)
        }
        setThreadId(storedThreadId)
        if (onThreadChange) onThreadChange(storedThreadId)

        setMessages([
            {
                id: "1",
                text: welcomeMessage,
                sender: "bot",
                timestamp: new Date(),
                actions: [
                    { label: "Check System Health", icon: CheckCircle2 },
                    { label: "View Active Incidents", icon: RefreshCw }
                ]
            }
        ])
    }, [storageKey, onThreadChange, welcomeMessage])

    // SSE and History Sync
    useEffect(() => {
        if (threadId && isOpen) {
            fetchHistory(threadId)
            const eventSource = new EventSource(`${API_BASE_URL}/chat/stream/${threadId}`)

            eventSource.onmessage = (event) => {
                const parsedData = JSON.parse(event.data)
                const eventWithTimestamp: AgentEvent = {
                    ...parsedData,
                    timestamp: parsedData.timestamp || Date.now() / 1000
                }
                setAgentEvents(prev => [...prev.slice(-10), eventWithTimestamp])
                if (parsedData.type === "agent_active") {
                    setCurrentAgent(parsedData.data.agent)
                } else if (parsedData.type === "user_transcript") {
                    const text = parsedData.data.text;
                    setMessages(prev => {
                        // Check if this user message already exists (to avoid duplicates from direct handleSend)
                        // In voice mode, messages usually don't have IDs that match Date.now() 
                        // So we just check if the last message is exact same text from user
                        const lastMsg = prev[prev.length - 1];
                        if (lastMsg && lastMsg.sender === "user" && lastMsg.text === text) {
                            return prev;
                        }
                        return [...prev, {
                            id: `voice-user-${Date.now()}`,
                            text: text,
                            sender: "user",
                            timestamp: new Date()
                        }];
                    });
                } else if (parsedData.type === "text_chunk") {
                    const chunk = parsedData.data.text;
                    setMessages(prev => {
                        const lastMsg = prev[prev.length - 1];
                        if (lastMsg && lastMsg.sender === "bot" && (lastMsg.id === "streaming" || lastMsg.id.startsWith("voice-bot-"))) {
                            return [...prev.slice(0, -1), { ...lastMsg, id: lastMsg.id, text: chunk }];
                        } else {
                            return [...prev, {
                                id: `voice-bot-${Date.now()}`,
                                text: chunk,
                                sender: "bot",
                                timestamp: new Date()
                            }];
                        }
                    });
                    setIsThinking(false); // Stop pulse as soon as first chunk arrives
                }
            }

            eventSource.onerror = (error) => {
                console.error("SSE connection error:", error)
                eventSource.close()
            }

            return () => eventSource.close()
        }
    }, [isOpen, threadId, fetchHistory])

    useEffect(() => {
        if (onThinkingChange) onThinkingChange(isThinking)
    }, [isThinking, onThinkingChange])

    const handleSend = useCallback(async (overrideValue?: string) => {
        const textToSend = overrideValue || inputValue

        if (!textToSend.trim()) return

        const userMsg: Message = {
            id: Date.now().toString(),
            text: textToSend,
            sender: "user",
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMsg])
        if (!overrideValue) setInputValue("")
        setIsThinking(true)

        try {
            const token = getAuthToken()
            const currentThreadId = threadId || localStorage.getItem(storageKey)
            if (!currentThreadId) {
                console.warn("No threadId found, falling back to local storage and setting it.")
                const fallbackId = `user-thread-${Date.now()}`
                localStorage.setItem(storageKey, fallbackId)
                setThreadId(fallbackId)
            }
            const actualThreadId = currentThreadId || `user-thread-${Date.now()}`

            // Determine API URL based on mode
            let url = `${API_BASE_URL}/chat/`
            if (isPublic) {
                url = `${API_BASE_URL}/chat/`
            } else if (agentId) {
                url = `${API_BASE_URL}/chat/agent`
            }

            const headers: Record<string, string> = {
                "Content-Type": "application/json"
            }
            if (token && !isPublic) {
                headers["Authorization"] = `Bearer ${token}`
            }

            console.log("[useChat] Request headers:", headers)

            const response = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    message: textToSend,
                    thread_id: actualThreadId,
                    workflow_id: workflowId,
                    agent_id: agentId
                }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                let errorMessage = `GRID error (${response.status}): ${errorData.detail || "Server malfunction"}`;

                if (response.status === 401) {
                    errorMessage = isPublic
                        ? "GRID failed: Unauthorized. This session may have expired."
                        : "GRID failed: Unauthorized. Please log in to your account.";
                } else if (response.status === 403) {
                    errorMessage = "GRID failed: Forbidden. You don't have permission to use this agent.";
                }

                throw new Error(errorMessage);
            }
            const data = await response.json()

            setIsThinking(false)
            const botMsg: Message = {
                id: Date.now().toString(),
                text: data.response,
                sender: "bot",
                timestamp: new Date(),
                actions: data.agent === "ticket_agent" ? [
                    { label: "View Ticket Progress", icon: RefreshCw, variant: "default" }
                ] : [
                    { label: "More Info", icon: RefreshCw, variant: "outline" }
                ]
            }
            setMessages(prev => {
                const filtered = prev.filter(m => m.id !== "streaming");
                return [...filtered, botMsg];
            })
        } catch (error: any) {
            console.error("Error calling AI System:", error)
            setIsThinking(false)
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: error.message || "GRID interrupted. Please ensure the FastAPI backend is running.",
                sender: "bot",
                timestamp: new Date(),
            }])
        }
    }, [inputValue, threadId, storageKey, isPublic, agentId, workflowId])

    const finishConversation = async () => {
        if (!threadId) return
        try {
            const token = getAuthToken()
            const res = await fetch(`${API_BASE_URL}/sessions/${threadId}/finish`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            })
            if (res.ok) {
                toast.success("Conversation finished & archived.")
                resetSession()
            }
        } catch (e) {
            console.error("Failed to finish session", e)
            toast.error("Failed to archive conversation.")
        }
    }

    return {
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
    }
}
