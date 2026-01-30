import React from "react"
import { Search, Activity, ArrowUp, ArrowDown } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Agent } from "@/types"
import { AgentTableRow } from "./AgentTableRow"

interface AgentsTableProps {
    agents: Agent[]
    loading: boolean
    searchQuery: string
    onSearchChange: (query: string) => void
    sortBy: string
    sortOrder: 'asc' | 'desc'
    onSort: (key: string) => void
    onEdit: (agent: Agent) => void
    onTest: (agent: Agent) => void
    onDelete: (id: string) => void
}

export const AgentsTable: React.FC<AgentsTableProps> = ({
    agents,
    loading,
    searchQuery,
    onSearchChange,
    sortBy,
    sortOrder,
    onSort,
    onEdit,
    onTest,
    onDelete
}) => {
    return (
        <Card className="bg-white dark:bg-slate-900 border-border rounded-lg overflow-hidden shadow-md">
            <div className="p-6 border-b border-border/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Search neural nodes..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-11 h-12 bg-slate-50 dark:bg-slate-800 border-border rounded-lg text-sm focus-visible:ring-primary transition-all focus:bg-background"
                    />
                </div>
            </div>

            <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                    <TableRow className="border-border hover:bg-transparent uppercase tracking-wider">
                        <TableHead
                            className="text-muted-foreground font-bold text-[10px] pl-8 cursor-pointer hover:text-primary transition-colors"
                            onClick={() => onSort('name')}
                        >
                            <div className="flex items-center gap-2">
                                AGENT NODE {sortBy === 'name' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                            </div>
                        </TableHead>
                        <TableHead
                            className="text-muted-foreground font-bold text-[10px] cursor-pointer hover:text-primary transition-colors"
                            onClick={() => onSort('type')}
                        >
                            <div className="flex items-center gap-2">
                                TYPE {sortBy === 'type' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                            </div>
                        </TableHead>
                        <TableHead className="text-muted-foreground font-bold text-[10px]">
                            <div className="flex items-center gap-1.5 pt-1">
                                <Activity className="h-3 w-3" /> CAPABILITIES
                            </div>
                        </TableHead>
                        <TableHead
                            className="text-muted-foreground font-bold text-[10px] cursor-pointer hover:text-primary transition-colors"
                            onClick={() => onSort('status')}
                        >
                            <div className="flex items-center gap-2">
                                STATUS {sortBy === 'status' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                            </div>
                        </TableHead>
                        <TableHead
                            className="text-muted-foreground font-bold text-[10px] cursor-pointer hover:text-primary transition-colors"
                            onClick={() => onSort('priority')}
                        >
                            <div className="flex items-center gap-2">
                                PRIORITY {sortBy === 'priority' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                            </div>
                        </TableHead>
                        <TableHead className="text-muted-foreground font-bold text-[10px]">SYNC LATENCY</TableHead>
                        <TableHead className="text-right pr-8 text-muted-foreground font-bold text-[10px]">ACTIONS</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-64 text-center">
                                <div className="flex flex-col items-center justify-center gap-3">
                                    <Activity className="h-8 w-8 text-primary/30 animate-pulse" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Scanning Neural Matrix...</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : agents.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-64 text-center">
                                <div className="flex flex-col items-center justify-center gap-3">
                                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center border border-border/50">
                                        <Search className="h-6 w-6 text-muted-foreground/30" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">No matching agents</p>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground opacity-50">Adjust criteria or initialize new agent</p>
                                    </div>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : agents.map((agent) => (
                        <AgentTableRow
                            key={agent.id}
                            agent={agent}
                            onEdit={onEdit}
                            onTest={onTest}
                            onDelete={onDelete}
                        />
                    ))}
                </TableBody>
            </Table>
        </Card>
    )
}
