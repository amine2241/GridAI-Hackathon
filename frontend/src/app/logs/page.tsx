"use client"

import { useState, useEffect } from "react"
import {
    Search,
    Download,
    CheckCircle2,
    XCircle,
    Terminal,
    History,
    Cpu
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ChatWidget } from "@/components/chatbot/ChatWidget"
import { ExecutionLog } from "@/types"
import { API_BASE_URL } from "@/lib/config"

export default function LogsPage() {
    const [logs, setLogs] = useState<ExecutionLog[]>([])
    const [selectedLog, setSelectedLog] = useState<ExecutionLog | null>(null)

    const fetchLogs = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/logs`)
            if (response.ok) {
                const data = await response.json()
                setLogs(data)
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error)
        }
    }

    useEffect(() => {
        fetchLogs()
        const interval = setInterval(fetchLogs, 5000)
        return () => clearInterval(interval)
    }, [])

    const filteredLogs = logs // Simple for now

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <ChatWidget
                agentName="Orova Grid Assistant"
                welcomeMessage="GRID established. How can I facilitate your request today?"
                primaryColor="#0070AD"
                capabilities={{
                    voice: true,
                    video: true,
                    knowledge: true,
                    automation: true
                }}
                mode="widget"
                isOpenByDefault={false}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <History className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-bold uppercase text-primary tracking-widest">Neural Archive</span>
                        <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest">Team 31</Badge>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Trace Terminal</h1>
                    <p className="text-muted-foreground font-medium text-sm">Historical execution telemetry of all autonomous grid operations.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-border bg-background text-foreground font-bold hover:bg-muted rounded-lg px-6 h-11 uppercase tracking-widest text-[10px] transition-all">
                        <Download className="mr-2 h-4 w-4" /> EXPORT JOURNAL
                    </Button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden shadow-md">
                <div className="p-6 border-b border-border/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Query neural traces..."
                            className="pl-11 h-12 bg-slate-50 dark:bg-slate-800 border-border rounded-lg text-sm focus-visible:ring-primary transition-all focus:bg-background"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-3 py-1 rounded font-bold uppercase tracking-widest text-[10px]">
                            {filteredLogs.filter(l => l.status === 'Success').length} Success
                        </Badge>
                        <Badge variant="outline" className="bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/20 px-3 py-1 rounded font-bold uppercase tracking-widest text-[10px]">
                            {filteredLogs.filter(l => l.status === 'Failure').length} Error
                        </Badge>
                    </div>
                </div>

                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                        <TableRow className="border-border hover:bg-transparent uppercase tracking-wider">
                            <TableHead className="text-muted-foreground font-bold text-[10px] pl-8">TIMESTAMP</TableHead>
                            <TableHead className="text-muted-foreground font-bold text-[10px]">NEURAL NODE</TableHead>
                            <TableHead className="text-muted-foreground font-bold text-[10px]">SYSTEM REF</TableHead>
                            <TableHead className="text-muted-foreground font-bold text-[10px]">STATUS</TableHead>
                            <TableHead className="text-right pr-8 text-muted-foreground font-bold text-[10px]">TELEMETRY</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLogs.map((log) => (
                            <TableRow key={log.id} className="border-border hover:bg-muted/30 transition-colors group">
                                <TableCell className="font-mono text-[11px] text-muted-foreground pl-8 py-3">
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 })}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded bg-primary/5 flex items-center justify-center border border-primary/10 group-hover:bg-primary/20 transition-colors">
                                            <Cpu className="h-4 w-4 text-primary" />
                                        </div>
                                        <span className="text-foreground font-bold tracking-tight uppercase text-xs">{log.agentName}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="font-mono text-[10px] text-muted-foreground">
                                    {log.incidentId || "SYS_ROOT"}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {log.status === 'Success' ? (
                                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                        ) : (
                                            <XCircle className="h-3 w-3 text-rose-500" />
                                        )}
                                        <span className={cn(
                                            "text-[9px] font-bold uppercase tracking-widest",
                                            log.status === 'Success' ? "text-emerald-500" : "text-rose-500"
                                        )}>
                                            {log.status === 'Success' ? "ACK SYNC" : "SYNC FAIL"}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-8">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedLog(log)}
                                                className="hover:bg-primary/5 text-primary font-bold rounded-lg h-9 transition-all uppercase tracking-widest text-[10px] border border-transparent hover:border-primary/10"
                                            >
                                                INSPECT PACKET
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-3xl bg-background border border-border text-foreground p-0 overflow-hidden rounded-lg shadow-2xl">
                                            {selectedLog && (
                                                <>
                                                    <DialogHeader className="p-8 border-b border-border/50 bg-slate-50 dark:bg-slate-800/50">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <Terminal className="h-5 w-5 text-primary" />
                                                            <DialogTitle className="text-2xl font-bold tracking-tight uppercase">Packet Inspection: {selectedLog.id.slice(0, 8)}</DialogTitle>
                                                        </div>
                                                        <DialogDescription className="text-muted-foreground font-medium">Deep telemetry capture from the neural node&apos;s last execution cycle.</DialogDescription>
                                                    </DialogHeader>
                                                    <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="p-5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-border/50">
                                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Neural Node</p>
                                                                <p className="text-sm font-bold text-foreground">{selectedLog.agentName}</p>
                                                            </div>
                                                            <div className={cn(
                                                                "p-5 rounded-lg border transition-all",
                                                                selectedLog.status === 'Success' ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20"
                                                            )}>
                                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Result Code</p>
                                                                <p className={cn(
                                                                    "text-sm font-bold",
                                                                    selectedLog.status === 'Success' ? "text-emerald-500" : "text-rose-500"
                                                                )}>{selectedLog.status.toUpperCase()}</p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <h4 className="text-[10px] font-bold text-foreground uppercase tracking-widest">Neural Input Payload</h4>
                                                            <div className="p-6 rounded-lg bg-slate-900 border border-slate-800 relative group">
                                                                <div className="absolute top-4 right-4 text-[10px] font-mono text-slate-500 font-bold uppercase">RAW TELEMETRY</div>
                                                                <pre className="text-xs font-mono text-primary font-bold leading-relaxed overflow-x-auto custom-scrollbar">
                                                                    {selectedLog.input}
                                                                </pre>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <h4 className="text-[10px] font-bold text-foreground uppercase tracking-widest">Neural Output Payload</h4>
                                                            <div className="p-6 rounded-lg bg-slate-900 border border-slate-800 relative group">
                                                                <div className="absolute top-4 right-4 text-[10px] font-mono text-slate-500 font-bold uppercase">RAW TELEMETRY</div>
                                                                <pre className="text-xs font-mono text-emerald-400 font-bold leading-relaxed overflow-x-auto custom-scrollbar">
                                                                    {selectedLog.output || selectedLog.error}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-8 border-t border-border/50 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                                                        <Button variant="outline" className="border-border bg-background text-foreground rounded-lg h-12 px-8 hover:bg-muted font-bold uppercase tracking-widest text-[10px]">
                                                            DOWNLOAD TRACE
                                                        </Button>
                                                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-12 px-8 font-bold shadow-sm uppercase tracking-widest text-[10px]">
                                                            CLOSE TERMINAL
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </DialogContent>
                                    </Dialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
