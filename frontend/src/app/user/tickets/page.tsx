'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    CheckCircle2,
    Circle,
    Clock,
    Activity,
    ArrowRight,
    Cpu,
    Search,
    Filter,
    History,
    Terminal,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import Cookies from 'js-cookie';

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    React.useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

const steps = [
    { id: 'reported', label: 'Reported', description: 'Ticket received by system' },
    { id: 'analyzed', label: 'AI Analysis', description: 'Diagnostic agents reviewing data' },
    { id: 'dispatching', label: 'Dispatching', description: 'Assigning technician or remote fix' },
    { id: 'resolved', label: 'Resolved', description: 'System back to normal' },
];

interface Ticket {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    createdAt: string;
    contact_type?: string;
    is_accelerated?: boolean;
}

export default function UserTicketsPage() {
    const { isAuthorized, isLoading: authLoading } = useRoleAccess(['user', 'admin']);
    const { user, token: authContextToken, logout } = useAuth();
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isLogsOpen, setIsLogsOpen] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [isEscalating, setIsEscalating] = useState(false);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const debouncedSearch = useDebounce(search, 500);

    const [tickets, setTickets] = useState<Ticket[]>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('user_tickets_cache');
            return cached ? JSON.parse(cached) : [];
        }
        return [];
    });
    const [loading, setLoading] = useState(!tickets.length);

    React.useEffect(() => {
        if (authLoading || !isAuthorized) return;

        const fetchTickets = async () => {
            // Priority: AuthContext token -> Cookie
            const activeToken = authContextToken || (typeof window !== 'undefined' ? Cookies.get('auth_token') : null);
            if (!activeToken) return;

            // Only show main loading if we don't have tickets or if we are filtering
            if (!tickets.length || debouncedSearch || statusFilter !== 'All' || priorityFilter !== 'All') {
                setLoading(true);
            }
            try {
                const params = new URLSearchParams();
                if (debouncedSearch) params.append('search', debouncedSearch);
                if (statusFilter !== 'All') params.append('status', statusFilter.toLowerCase());
                if (priorityFilter !== 'All') params.append('priority', priorityFilter.toLowerCase());

                const res = await fetch(`${API_URL}/tickets/my?${params.toString()}`, {
                    headers: { 'Authorization': `Bearer ${activeToken}` }
                });

                if (res.status === 401) {
                    logout();
                    return;
                }

                if (res.ok) {
                    const data = await res.json();
                    setTickets(data);
                    // Cache global list (no search/filter)
                    if (!debouncedSearch && statusFilter === 'All' && priorityFilter === 'All') {
                        localStorage.setItem('user_tickets_cache', JSON.stringify(data));
                    }
                    if (data.length > 0) {
                        if (!selectedTicket || !data.find((t: Ticket) => t.id === selectedTicket.id)) {
                            setSelectedTicket(data[0]);
                        }
                    } else {
                        setSelectedTicket(null);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch tickets", e);
            } finally {
                setLoading(false);
            }
        };
        fetchTickets();
    }, [API_URL, debouncedSearch, statusFilter, priorityFilter, authContextToken, isAuthorized, authLoading]);

    const fetchLogs = async (ticketId: string) => {
        // Priority: AuthContext token -> Cookie
        const activeToken = authContextToken || (typeof window !== 'undefined' ? Cookies.get('auth_token') : null);
        if (!activeToken) return;
        setLoadingLogs(true);
        try {
            const res = await fetch(`${API_URL}/tickets/${ticketId}/logs`, {
                headers: { 'Authorization': `Bearer ${activeToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (e) {
            console.error("Failed to fetch logs", e);
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleEscalate = async () => {
        // Priority: AuthContext token -> Cookie
        const activeToken = authContextToken || (typeof window !== 'undefined' ? Cookies.get('auth_token') : null);
        if (!safeSelectedTicket || !activeToken) return;
        setIsEscalating(true);
        try {
            const res = await fetch(`${API_URL}/tickets/${safeSelectedTicket.id}/escalate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${activeToken}` }
            });
            if (res.ok) {
                toast.success("TECHNICAL ESCALATION INITIATED", {
                    description: "Neural priority has been increased for this node."
                });
                // Update local state
                setTickets(prev => prev.map(t =>
                    t.id === safeSelectedTicket.id ? { ...t, is_accelerated: true } : t
                ));
            }
        } catch (e) {
            console.error("Failed to escalate", e);
            toast.error("ESCALATION FAILED");
        } finally {
            setIsEscalating(false);
        }
    };

    const isInitialLoad = loading && tickets.length === 0 && !search && statusFilter === 'All' && priorityFilter === 'All';

    if (authLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">Scanning Neural Network...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) return null;

    if (isInitialLoad) return <div className="p-8 text-center text-slate-500 font-mono">Initializing Neural Uplink...</div>;

    const safeSelectedTicket = selectedTicket || tickets[0];
    const currentStepIndex = Math.max(0, steps.findIndex(s => {
        const status = safeSelectedTicket?.status?.toLowerCase() || 'new';
        if (status === 'new') return s.id === 'reported';
        if (status === 'ai analysis') return s.id === 'analyzed';
        if (status === 'in progress') return s.id === 'dispatching';
        return s.id === status;
    }));

    return (
        <div className="space-y-10 pb-20">
            <div className="flex flex-col lg:flex-row gap-10">
                {/* Vertical Filter Sidebar */}
                <div className="lg:w-64 flex-shrink-0 space-y-10">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="SEARCH NODES..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 bg-slate-50 dark:bg-slate-900 border-border/50 shadow-none text-[10px] font-black tracking-widest uppercase h-12 rounded-lg focus-visible:ring-1 focus-visible:ring-primary/20"
                        />
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-2">Network Status</h3>
                            <div className="space-y-1">
                                {['All', 'New', 'AI analysis', 'In Progress', 'Resolved', 'Closed', 'Canceled'].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter(s)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-3.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all group",
                                            statusFilter === s
                                                ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]"
                                                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-foreground"
                                        )}
                                    >
                                        <span>{s}</span>
                                        <ArrowRight className={cn("w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1", statusFilter === s && "opacity-100")} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-2">Priority Levels</h3>
                            <div className="space-y-1">
                                {['All', 'Low', 'Medium', 'High'].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPriorityFilter(p)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-3.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all group",
                                            priorityFilter === p
                                                ? "bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white shadow-xl scale-[1.02]"
                                                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-foreground"
                                        )}
                                    >
                                        <span>{p}</span>
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full transition-all",
                                            p === 'High' ? "bg-rose-500" : p === 'Medium' ? "bg-amber-500" : p === 'Low' ? "bg-emerald-500" : "bg-slate-400",
                                            priorityFilter === p ? "scale-150 ring-4 ring-white/20" : "opacity-40"
                                        )} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>


                </div>

                {/* Main Content Area */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 h-fit [&>*]:border-0 [&>*]:!border-l-0 [&>*]:!border-r-0">
                    {/* Ticket List Column */}
                    <div className="space-y-4 lg:pr-8 border-0">
                        <div className="flex items-center justify-between mb-2 px-2">
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Node Inventory</h2>
                            {loading && <Activity className="h-3 w-3 text-primary animate-pulse" />}
                        </div>

                        <div className="space-y-4 overflow-y-auto max-h-[800px] pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {tickets.length === 0 && !loading ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="p-10 text-center rounded-lg border-2 border-dashed border-border/50 bg-slate-50/50 dark:bg-slate-900/20"
                                >
                                    <Terminal className="h-8 w-8 text-slate-200 mx-auto mb-4" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching tickets</p>
                                </motion.div>
                            ) : (
                                tickets.map((ticket, idx) => (
                                    <motion.div
                                        key={ticket.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        onClick={() => setSelectedTicket(ticket)}
                                        className={cn(
                                            "p-5 rounded-lg border transition-all cursor-pointer relative group",
                                            selectedTicket?.id === ticket.id
                                                ? "bg-white dark:bg-slate-900 border-primary shadow-2xl shadow-primary/10 scale-[1.02] ring-1 ring-primary/20"
                                                : "bg-white/60 dark:bg-slate-900/40 border-border/60 hover:border-slate-300 dark:hover:border-slate-700"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-widest">
                                                    {ticket.id}
                                                </span>
                                                {ticket.contact_type === 'iot' && (
                                                    <Badge variant="outline" className="text-[7px] font-black bg-purple-500/10 text-purple-600 border-purple-500/20 uppercase tracking-widest px-1.5 py-0">IOT_LINK</Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    ticket.priority === 'High' || ticket.priority === 'Critical' ? 'bg-rose-500 shadow-lg shadow-rose-500/20 animate-pulse' :
                                                        ticket.priority === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                                                )} />
                                                <span className={cn(
                                                    "text-[8px] font-black uppercase tracking-widest",
                                                    ticket.priority === 'High' || ticket.priority === 'Critical' ? 'text-rose-500' :
                                                        ticket.priority === 'Medium' ? 'text-amber-500' : 'text-slate-400'
                                                )}>
                                                    {ticket.priority}
                                                </span>
                                            </div>
                                        </div>
                                        <h3 className="font-black text-sm mb-2 text-foreground uppercase tracking-tight line-clamp-1">{ticket.title}</h3>
                                        <div className="flex items-center justify-between">
                                            <p className="text-[9px] text-slate-400 flex items-center gap-1.5 font-black uppercase tracking-widest">
                                                <Clock className="w-3 h-3 text-slate-300" />
                                                {new Date(ticket.createdAt).toLocaleDateString()}
                                            </p>
                                            <span className={cn(
                                                "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                                                ticket.status === 'Resolved' || ticket.status === 'Closed' ? "bg-emerald-500/10 text-emerald-600" :
                                                    ticket.status === 'In Progress' ? "bg-blue-500/10 text-blue-600" :
                                                        ticket.status === 'AI analysis' ? "bg-purple-500/10 text-purple-600" :
                                                            "bg-primary/10 text-primary"
                                            )}>
                                                {ticket.status}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right column: Ticket Tracker Status */}
                    <div className="space-y-6 lg:pl-8 lg:border-l-0">
                        {!safeSelectedTicket ? (
                            <div className="h-[400px] flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-lg bg-slate-50 dark:bg-slate-800/10 text-slate-400 italic text-sm">
                                <Activity className="h-8 w-8 mb-4 opacity-20" />
                                Select an incident to view its neural tracking status.
                            </div>
                        ) : (
                            <motion.div
                                layoutId="tracker-card"
                                className="p-8 rounded-lg bg-white dark:bg-slate-900 border border-border shadow-xl relative overflow-hidden"
                            >
                                <div className="flex items-center justify-between mb-12">
                                    <div>
                                        <h2 className="text-2xl font-bold mb-1 text-foreground uppercase tracking-tight">{safeSelectedTicket.id} Tracker</h2>
                                        <p className="text-slate-500 text-sm font-medium">{safeSelectedTicket.title}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <Activity className="w-8 h-8 text-[#0070AD]/40 animate-pulse" />
                                        {safeSelectedTicket.contact_type === 'iot' && (
                                            <Badge variant="outline" className="text-[9px] font-black bg-purple-500/10 text-purple-600 border-purple-500/20 uppercase tracking-widest">Neural Triggered</Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Stepper Animation */}
                                <div className="relative mb-8">
                                    {/* Progress Line */}
                                    <div className="absolute top-5 left-0 w-full h-[2px] bg-slate-100 dark:bg-slate-800 -z-0" />
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                                        className="absolute top-5 left-0 h-[2px] bg-[#0070AD] -z-0"
                                    />

                                    <div className="relative z-10 flex justify-between">
                                        {steps.map((step, index) => {
                                            const isCompleted = index < currentStepIndex;
                                            const isCurrent = index === currentStepIndex;

                                            return (
                                                <div key={step.id} className="flex flex-col items-center gap-3 max-w-[120px]">
                                                    <motion.div
                                                        animate={{
                                                            scale: isCurrent ? 1.2 : 1,
                                                            backgroundColor: isCompleted || isCurrent ? '#0070AD' : 'transparent',
                                                            borderColor: isCompleted || isCurrent ? '#0070AD' : '#94a3b8'
                                                        }}
                                                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center bg-white dark:bg-slate-900 transition-colors`}
                                                    >
                                                        {isCompleted ? (
                                                            <CheckCircle2 className="w-5 h-5 text-white" />
                                                        ) : isCurrent ? (
                                                            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                                                        ) : (
                                                            <Circle className="w-5 h-5 text-slate-400" />
                                                        )}
                                                    </motion.div>
                                                    <div className="text-center">
                                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isCurrent ? 'text-primary' : 'text-slate-500'}`}>
                                                            {step.label}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Detail Panel */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={safeSelectedTicket.id + '-details'}
                                    className="mt-8 p-6 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-border"
                                >
                                    <h3 className="text-[10px] font-bold flex items-center gap-2 mb-3 tracking-widest uppercase text-[#0070AD]">
                                        <Activity className="w-3 h-3" /> Incident Description
                                    </h3>
                                    <div className="text-sm text-slate-600 dark:text-slate-300 mb-4 font-medium leading-relaxed prose prose-slate dark:prose-invert max-w-none prose-sm italic">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {safeSelectedTicket.description || 'No additional details available.'}
                                        </ReactMarkdown>
                                    </div>
                                    <div className="flex items-center gap-4 pt-4">
                                        <button
                                            onClick={() => {
                                                if (safeSelectedTicket) {
                                                    fetchLogs(safeSelectedTicket.id);
                                                    setIsLogsOpen(true);
                                                }
                                            }}
                                            className="text-[10px] font-bold text-[#0070AD] hover:underline flex items-center gap-1 uppercase tracking-widest"
                                        >
                                            View full logs <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}

                        <div
                            onClick={() => {
                                if (!safeSelectedTicket?.is_accelerated) {
                                    handleEscalate();
                                }
                            }}
                            className={cn(
                                "p-6 rounded-lg border border-dashed border-border flex items-center justify-center gap-4 transition-all bg-white dark:bg-slate-900/50",
                                isEscalating ? "opacity-50 cursor-wait" :
                                    safeSelectedTicket?.is_accelerated ? "cursor-default opacity-80 border-primary text-primary" :
                                        "hover:text-[#0070AD] cursor-pointer hover:border-[#0070AD]"
                            )}
                        >
                            {isEscalating ? (
                                <Activity className="w-5 h-5 animate-spin" />
                            ) : safeSelectedTicket?.is_accelerated ? (
                                <CheckCircle2 className="w-5 h-5 text-primary" />
                            ) : (
                                <Clock className="w-5 h-5" />
                            )}
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                {isEscalating ? 'PROCESSING ESCALATION...' :
                                    safeSelectedTicket?.is_accelerated ? 'NEURAL ESCALATION ACTIVE' :
                                        'Request accelerated resolution on this ticket?'}
                            </span>
                        </div>

                        <Sheet open={isLogsOpen} onOpenChange={setIsLogsOpen}>
                            <SheetContent side="right" className="w-full sm:max-w-[800px] bg-slate-50 dark:bg-slate-950 border-l border-border p-0">
                                <SheetHeader className="p-6 border-b border-border bg-white dark:bg-slate-900">
                                    <div className="flex items-center gap-2 mb-2">
                                        <History className="w-4 h-4 text-primary" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Neural Activity Log</span>
                                    </div>
                                    <SheetTitle className="text-2xl font-bold uppercase tracking-tighter">
                                        {safeSelectedTicket?.id} History
                                    </SheetTitle>
                                    <SheetDescription className="text-xs font-medium">
                                        Complete technical audit trail and AI diagnostics.
                                    </SheetDescription>
                                </SheetHeader>

                                <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-180px)]">
                                    {loadingLogs ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                            <div className="h-8 w-8 border-4 border-primary border-t-transparent animate-spin rounded-full" />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Syncing activity stream...</p>
                                        </div>
                                    ) : logs.length === 0 ? (
                                        <div className="text-center py-20 italic text-slate-500 text-sm">
                                            No historical logs available for this node.
                                        </div>
                                    ) : (
                                        <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
                                            {logs.map((log) => (
                                                <div key={log.sys_id} className="relative pl-12">
                                                    <div className={`absolute left-0 top-1 w-9 h-9 rounded-full border-4 border-slate-50 dark:border-slate-950 flex items-center justify-center ${log.type === 'work_notes' ? 'bg-amber-500' : 'bg-[#0070AD]'
                                                        }`}>
                                                        {log.type === 'work_notes' ? (
                                                            <Terminal className="w-4 h-4 text-white" />
                                                        ) : (
                                                            <Activity className="w-4 h-4 text-white" />
                                                        )}
                                                    </div>
                                                    <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-border shadow-sm">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${log.type === 'work_notes' ? 'text-amber-600' : 'text-[#0070AD]'
                                                                }`}>
                                                                {log.type === 'work_notes' ? 'Neural Diagnostic / Work Note' : 'System Comment'}
                                                            </span>
                                                            <span className="text-[9px] font-medium text-slate-400">
                                                                {new Date(log.timestamp).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs font-medium text-slate-600 dark:text-slate-300 prose prose-slate dark:prose-invert max-w-none prose-xs leading-relaxed">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                {log.text}
                                                            </ReactMarkdown>
                                                        </div>
                                                        <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800/50 flex items-center gap-2">
                                                            <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[8px] font-black">
                                                                {log.user?.[0]?.toUpperCase()}
                                                            </div>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Updated by: {log.user}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </div>
    );
}
