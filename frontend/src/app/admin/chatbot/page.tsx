"use client"

import { Bot, Zap, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ChatWidget } from "@/components/chatbot/ChatWidget"
import { Toaster } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { useChatbotBuilder } from "@/hooks/useChatbotBuilder"
import { BuilderSettings } from "@/components/chatbot/BuilderSettings"
import { DeploymentTabs } from "@/components/chatbot/DeploymentTabs"
import Link from "next/link"

export default function ChatbotPage() {
    const { user } = useAuth()
    const {
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
    } = useChatbotBuilder()

    if (user?.role === 'user') {
        return (
            <div className="h-[calc(100vh-100px)] w-full py-4 overflow-hidden">
                <div className="h-full w-full rounded-lg overflow-hidden shadow-2xl border border-border bg-card">
                    <ChatWidget
                        title="AI System"
                        description="Multi-agent Support"
                        agentName={agentName}
                        welcomeMessage={welcomeMessage}
                        primaryColor={primaryColor}
                        capabilities={capabilities}
                        mode="embedded"
                        showActivityPanel={false}
                        workflowId={selectedWorkflowId === "default" ? undefined : selectedWorkflowId}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-10 font-sans pb-32">
            <Toaster position="top-right" richColors closeButton />

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-card p-8 rounded-lg border border-border shadow-sm">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
                            <Bot className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none">
                                Chatbot Builder
                                <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest">Team 31</Badge>
                            </h1>
                            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic opacity-60">Configure, Customize & Deploy | Generate Integration Code</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-black uppercase tracking-widest px-3 py-1">
                        System Online
                    </Badge>
                    <Link
                        href="/public-chat"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-1 bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500/20 transition-all"
                    >
                        <ExternalLink className="h-3 w-3" />
                        View Example
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                {/* Left Column: Settings & Deployment */}
                <div className="xl:col-span-7 space-y-8">
                    <DeploymentTabs
                        agentName={agentName}
                        welcomeMessage={welcomeMessage}
                        primaryColor={primaryColor}
                        capabilities={capabilities}
                        selectedWorkflowId={selectedWorkflowId}
                    />

                    <BuilderSettings
                        workflows={workflows}
                        selectedWorkflowId={selectedWorkflowId}
                        onWorkflowChange={handleWorkflowChange}
                        agentName={agentName}
                        onAgentNameChange={updateAgentName}
                        primaryColor={primaryColor}
                        onPrimaryColorChange={updatePrimaryColor}
                        welcomeMessage={welcomeMessage}
                        onWelcomeMessageChange={updateWelcomeMessage}
                        capabilities={capabilities}
                        onCapabilitiesChange={updateCapability}
                    />
                </div>

                {/* Right Column: Live Preview */}
                <div className="xl:col-span-5 sticky top-8">
                    <div className="flex flex-col h-[750px] bg-card rounded-lg border border-border shadow-2xl overflow-hidden relative group">
                        {/* Preview Header */}
                        <div className="p-4 bg-muted/50 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground">Live Preview Interface</h3>
                            </div>
                            <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-tighter">Production View</Badge>
                        </div>

                        {/* Preview Content */}
                        <div className="flex-1 relative overflow-hidden">
                            <ChatWidget
                                key={previewKey}
                                agentName={agentName}
                                welcomeMessage={welcomeMessage}
                                primaryColor={primaryColor}
                                capabilities={capabilities}
                                mode="embedded"
                                showActivityPanel={false}
                                workflowId={selectedWorkflowId === "default" ? undefined : selectedWorkflowId}
                            />
                        </div>

                        {/* Footer Hint */}
                        <div className="p-3 bg-primary/5 border-t border-primary/10 text-center">
                            <p className="text-[8px] font-bold text-primary uppercase tracking-[0.2em]">Preview reflects real-time changes</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

