"use client"

import { useState, useEffect } from "react"
import {
    Cpu,
    ChevronDown,
    Zap
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ChatWidget } from "@/components/chatbot/ChatWidget"
import { AgentActivityPanel } from "@/components/chatbot/AgentActivityPanel"
import { useAgentStream } from "@/hooks/useAgentStream"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { API_BASE_URL } from "@/lib/config"

interface Workflow {
    id: string
    name: string
    description: string
}

export default function WorkflowsPage() {
    const [threadId, setThreadId] = useState<string | null>(null)
    const [isThinking, setIsThinking] = useState(false)
    const [workflows, setWorkflows] = useState<Workflow[]>([])
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("default")

    useEffect(() => {
        fetchWorkflows()
    }, [])

    const getAuthToken = () => document.cookie.split('auth_token=')[1]?.split(';')[0]

    const fetchWorkflows = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/workflows`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            })
            if (res.ok) {
                const data = await res.json()
                setWorkflows(data)
            }
        } catch (err) {
            console.error("Failed to fetch workflows")
        }
    }

    // Connect to the real-time agent stream using the active thread ID
    const { events, currentAgent } = useAgentStream(threadId)

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 h-[calc(100vh-100px)]">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 pb-6 border-b border-border/50">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-1.5 w-6 bg-primary rounded-full" />
                        <span className="text-[10px] font-bold uppercase text-primary tracking-widest">Neural Nexus // Operations</span>
                        <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest">Team 31</Badge>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Agent Workflow Simulator</h1>
                    <p className="text-muted-foreground font-medium text-sm">Live multi-agent orchestration with real-time execution visualization.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-lg bg-card border border-border shadow-sm">
                        <Cpu className="h-4 w-4 text-primary" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter leading-none">Neural Node</span>
                            <span className="text-[10px] font-black text-foreground uppercase tracking-widest mt-1">
                                {selectedWorkflowId === "default" ? "Default System" : workflows.find(w => w.id === selectedWorkflowId)?.name}
                            </span>
                        </div>
                    </div>

                    <div className="w-[240px]">
                        <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
                            <SelectTrigger className="h-12 bg-card border-border rounded-lg font-bold text-xs uppercase tracking-widest shadow-sm">
                                <SelectValue placeholder="Select Neural Node" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border shadow-xl">
                                <SelectItem value="default" className="font-bold text-xs uppercase tracking-widest py-3">Default System Logic</SelectItem>
                                {workflows.map(wf => (
                                    <SelectItem key={wf.id} value={wf.id} className="font-bold text-xs uppercase tracking-widest italic py-3">
                                        {wf.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-0">
                <div className="lg:col-span-4 h-full flex flex-col min-h-0">
                    <div className="bg-white dark:bg-slate-900 border border-border rounded-lg h-full flex flex-col shadow-md overflow-hidden relative">
                        {/* Embedded Chat Widget - No internal activity panel */}
                        <div className="absolute inset-0">
                            <ChatWidget
                                mode="embedded"
                                isOpenByDefault={true}
                                showActivityPanel={false}
                                onThreadChange={setThreadId}
                                onThinkingChange={setIsThinking}
                                workflowId={selectedWorkflowId === "default" ? undefined : selectedWorkflowId}
                            />
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 h-full flex flex-col min-h-0">
                    <div className="bg-slate-950 border border-border rounded-lg shadow-md relative overflow-hidden h-full flex flex-col">
                        {/* The Real Agent Activity Panel - Full Mode */}
                        <div className="flex-1 w-full h-full">
                            <AgentActivityPanel
                                events={events}
                                currentAgent={currentAgent}
                                isThinking={isThinking}
                                variant="full"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
