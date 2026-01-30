import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { API_BASE_URL } from "@/lib/config"
import Cookies from "js-cookie"

interface Workflow {
    id: string
    name: string
    description: string
}

export function useChatbotBuilder() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const urlWorkflowId = searchParams.get('workflow')

    const [workflows, setWorkflows] = useState<Workflow[]>([])
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(urlWorkflowId || "default")
    const [agentName, setAgentName] = useState("AI Customer Service")
    const [welcomeMessage, setWelcomeMessage] = useState("GRID established. How can I facilitate your request today?")
    const [primaryColor, setPrimaryColor] = useState("#0070AD")
    const [previewKey, setPreviewKey] = useState(0)
    const [capabilities, setCapabilities] = useState({
        voice: true,
        video: true,
        knowledge: true,
        automation: true
    })

    const fetchWorkflows = useCallback(async () => {
        try {
            const token = Cookies.get('auth_token')
            const res = await fetch(`${API_BASE_URL}/admin/workflows`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            })
            if (res.ok) {
                const data = await res.json()
                setWorkflows(data)
            }
        } catch (err) {
            console.error("Failed to fetch workflows")
        }
    }, [])

    useEffect(() => {
        fetchWorkflows()
    }, [fetchWorkflows])

    const handleWorkflowChange = (id: string) => {
        setSelectedWorkflowId(id)
        setPreviewKey(prev => prev + 1)
        const params = new URLSearchParams(searchParams.toString())
        if (id === "default") {
            params.delete('workflow')
        } else {
            params.set('workflow', id)
        }
        router.replace(`?${params.toString()}`, { scroll: false })
    }

    const updateCapability = (caps: any) => {
        setCapabilities(caps)
        setPreviewKey(prev => prev + 1)
    }

    const updateAgentName = (name: string) => {
        setAgentName(name)
        setPreviewKey(prev => prev + 1)
    }

    const updatePrimaryColor = (color: string) => {
        setPrimaryColor(color)
        setPreviewKey(prev => prev + 1)
    }

    const updateWelcomeMessage = (msg: string) => {
        setWelcomeMessage(msg)
        setPreviewKey(prev => prev + 1)
    }

    return {
        workflows,
        selectedWorkflowId,
        handleWorkflowChange,
        agentName,
        updateAgentName,
        welcomeMessage,
        updateWelcomeMessage,
        primaryColor,
        updatePrimaryColor,
        capabilities,
        updateCapability,
        previewKey
    }
}
