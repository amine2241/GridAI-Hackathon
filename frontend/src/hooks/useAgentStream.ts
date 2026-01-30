
import { useEffect, useState } from "react"
import { API_BASE_URL } from "@/lib/config"
import { AgentEvent } from "@/components/chatbot/AgentActivityPanel"

export function useAgentStream(threadId: string | null) {
    const [events, setEvents] = useState<AgentEvent[]>([])
    const [currentAgent, setCurrentAgent] = useState<string | null>(null)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        if (!threadId) return

        const eventSource = new EventSource(`${API_BASE_URL}/chat/stream/${threadId}`)
        setIsConnected(true)

        eventSource.onmessage = (event) => {
            try {
                const parsedData = JSON.parse(event.data)
                setEvents(prev => [...prev.slice(-19), parsedData]) // Keep last 20 events

                if (parsedData.type === "agent_active") {
                    setCurrentAgent(parsedData.data.agent)
                }
            } catch (e) {
                console.error("Error parsing SSE event:", e)
            }
        }

        eventSource.onerror = (error) => {
            console.error("SSE connection error:", error)
            eventSource.close()
            setIsConnected(false)
        }

        return () => {
            eventSource.close()
            setIsConnected(false)
        }
    }, [threadId])

    return { events, currentAgent, isConnected }
}
