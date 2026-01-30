import React from "react"
import { Cpu, Play, Edit, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableRow, TableCell } from "@/components/ui/table"
import { Agent } from "@/types"
import { cn } from "@/lib/utils"

interface AgentTableRowProps {
    agent: Agent
    onEdit: (agent: Agent) => void
    onTest: (agent: Agent) => void
    onDelete: (id: string) => void
}

export const AgentTableRow: React.FC<AgentTableRowProps> = ({ agent, onEdit, onTest, onDelete }) => {
    return (
        <TableRow key={agent.id} className="border-border hover:bg-muted/30 transition-colors group">
            <TableCell className="pl-8">
                <div className="flex items-center gap-3 py-1">
                    <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center border border-primary/10 group-hover:scale-105 transition-transform">
                        <Cpu className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <p className="font-bold text-sm text-foreground tracking-tight">{agent.name}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{agent.id.slice(0, 8)}</p>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-foreground rounded text-[9px] font-bold uppercase tracking-widest border-border">
                    {agent.type}
                </Badge>
            </TableCell>
            <TableCell>
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {agent.tools?.map((tool, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-primary/5 border border-primary/10 text-[8px] font-black text-primary uppercase tracking-tighter">
                            {tool.split(' ')[0]}
                        </span>
                    ))}
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "h-1.5 w-1.5 rounded-full animate-pulse",
                        agent.status === 'Active' ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-slate-400"
                    )} />
                    <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        agent.status === 'Active' ? "text-emerald-500" : "text-muted-foreground"
                    )}>
                        {agent.status}
                    </span>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={cn(
                            "h-3 w-1.5 rounded-sm",
                            i < Math.min(agent.priority, 5) ? "bg-primary" : "bg-muted"
                        )} />
                    ))}
                </div>
            </TableCell>
            <TableCell>
                <span className="font-mono text-[11px] text-muted-foreground">
                    {agent.id === 'agent-support' ? '12ms' :
                        agent.id === 'agent-rag' ? '45ms' :
                            agent.id === 'agent-ticket' ? '28ms' : '15ms'}
                </span>
            </TableCell>
            <TableCell className="text-right pr-8">
                <div className="flex items-center justify-end gap-2 text-muted-foreground">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                        onClick={() => onTest(agent)}
                        title="Test Node Direct"
                    >
                        <Play className="h-3.5 w-3.5 fill-current" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                        onClick={() => onEdit(agent)}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                        onClick={() => onDelete(agent.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    )
}
