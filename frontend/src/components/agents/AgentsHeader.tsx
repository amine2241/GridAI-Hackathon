import React from "react"
import { Bot, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface AgentsHeaderProps {
    onCreateOpen: () => void
}

export const AgentsHeader: React.FC<AgentsHeaderProps> = ({ onCreateOpen }) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Bot className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase text-primary tracking-widest">Directory Nodes</span>
                    <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest">Team 31</Badge>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Neural Directory</h1>
                <p className="text-muted-foreground font-medium text-sm">Manage and configure the collection of specialized AI agents.</p>
            </div>

            <Button
                onClick={onCreateOpen}
                className="rounded-lg h-11 px-6 font-bold text-xs uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
                <Plus className="mr-2 h-4 w-4" /> INITIALIZE AGENT
            </Button>
        </div>
    )
}
