import React from "react"
import { Bot, CheckCircle, RefreshCw, Minimize2, Maximize2, Phone, Video, Minus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ChatHeaderProps {
    agentName: string
    primaryColor: string
    variant: "embedded" | "widget"
    isExpanded?: boolean
    onExpandToggle?: () => void
    onReset: () => void
    onFinish: () => void
    onCallStart?: (mode: "audio" | "video") => void
    onClose: () => void
    capabilities?: { voice: boolean; video: boolean }
    callMode?: "audio" | "video" | null
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    agentName,
    primaryColor,
    variant,
    isExpanded,
    onExpandToggle,
    onReset,
    onFinish,
    onCallStart,
    onClose,
    capabilities,
    callMode
}) => {
    if (variant === "embedded") {
        return (
            <div className="p-6 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-xl z-20">
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm group-hover:scale-110 transition-transform duration-500">
                            <Bot className="h-6 w-6 text-primary" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-foreground uppercase tracking-[0.15em] leading-none">
                                {agentName}
                            </h3>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[7px] font-black uppercase tracking-widest px-1.5 py-0 h-3.5">Team 31</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1.5">
                                <span className="h-1 w-1 rounded-full bg-emerald-500" />
                                <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest">GRID Active</span>
                            </div>
                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Session ID: 0x31-BETA</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all" onClick={onReset} title="Reset Session">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="p-5 flex items-center justify-between border-b border-black/5 dark:border-white/5 shadow-sm shrink-0" style={{ background: `linear-gradient(135deg, ${primaryColor}15, transparent)` }}>
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shadow-sm border border-border relative">
                    <Bot className="h-6 w-6" style={{ color: primaryColor }} />
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-tight leading-none flex items-center gap-2">
                        {agentName}
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[7px] font-black uppercase tracking-widest px-1 py-0 h-3">Team 31</Badge>
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Neural Assistant</p>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50" onClick={onFinish} title="Finish & Archive"><CheckCircle className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onReset} title="Clear Chat"><RefreshCw className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onExpandToggle}>{isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</Button>
                <Button variant="ghost" size="icon" className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", callMode === "audio" && "text-primary animate-pulse")} onClick={() => onCallStart?.('audio')} disabled={!!callMode || !capabilities?.voice} title="Start Voice Call"><Phone className="h-4 w-4" /></Button>
                {capabilities?.video && (
                    <Button variant="ghost" size="icon" className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", callMode === "video" && "text-primary animate-pulse")} title="Start Video Call" onClick={() => onCallStart?.('video')} disabled={!!callMode || !capabilities?.video}><Video className="h-4 w-4" /></Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={onClose}><X className="h-4 w-4" /></Button>
            </div>
        </div>
    )
}
