import React from "react"
import { Eye, Sparkles, Bot } from "lucide-react"
import { ChatWidget } from "@/components/chatbot/ChatWidget"

interface LivePreviewProps {
    previewKey: number
    agentName: string
    welcomeMessage: string
    primaryColor: string
    capabilities: any
    selectedWorkflowId: string
    workflows: any[]
}

export const LivePreview: React.FC<LivePreviewProps> = ({
    previewKey,
    agentName,
    welcomeMessage,
    primaryColor,
    capabilities,
    selectedWorkflowId,
    workflows
}) => {
    return (
        <div className="bg-card border border-border rounded-lg p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                    <Eye className="h-5 w-5 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Live Preview</h3>
                    <div className="flex items-center gap-2 ml-4 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Live Updates</span>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-xs font-black text-primary uppercase mb-1 leading-none">Real-Time Calibration</h4>
                        <p className="text-[11px] text-muted-foreground font-medium">Changes to agent name, color, greeting, and neural node update instantly in the preview below.</p>
                    </div>
                </div>
            </div>

            <div className="relative h-[650px] rounded-lg border border-border overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
                {/* Preview Status Indicator */}
                <div className="absolute top-6 left-6 z-10 pointer-events-none">
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-5 py-3 rounded-lg border border-border shadow-lg flex items-center gap-4 animate-in slide-in-from-left-4 duration-500">
                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                            <Bot className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="text-[11px] font-black text-foreground uppercase tracking-tight">Simulator Active</h4>
                            <p className="text-[10px] text-muted-foreground font-medium">Neural interface is linked</p>
                        </div>
                        {selectedWorkflowId !== "default" && (
                            <div className="ml-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{workflows.find(w => w.id === selectedWorkflowId)?.name}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actual Widget */}
                <ChatWidget
                    key={previewKey}
                    agentName={agentName}
                    welcomeMessage={welcomeMessage}
                    primaryColor={primaryColor}
                    capabilities={capabilities}
                    mode="widget"
                    isOpenByDefault={false}
                    workflowId={selectedWorkflowId === "default" ? undefined : selectedWorkflowId}
                />
            </div>
        </div>
    )
}
