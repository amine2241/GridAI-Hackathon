"use client"

import { useEffect, useState } from "react"
import {
    Plus,
    Search,
    Clock,
    ShieldAlert,
    Zap,
    ArrowUpRight,
    History,
    FileText,
    Filter,
    X,
    LayoutGrid,
    List
} from "lucide-react"
import { Card } from "@/components/ui/card"
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
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { ChatWidget } from "@/components/chatbot/ChatWidget"
import { Incident } from "@/types"
import { API_BASE_URL } from "@/lib/config"
import { useAuth } from "@/context/AuthContext"

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

export default function IncidentsPage() {
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
    const [incidents, setIncidents] = useState<Incident[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')
    const [priorityFilter, setPriorityFilter] = useState('All')
    const debouncedSearch = useDebounce(search, 500)

    const { token, logout } = useAuth()

    useEffect(() => {
        const fetchIncidents = async () => {
            if (!token) return;
            try {
                const params = new URLSearchParams();
                if (debouncedSearch) params.append('search', debouncedSearch);
                if (statusFilter !== 'All') params.append('status', statusFilter.toLowerCase());
                if (priorityFilter !== 'All') params.append('priority', priorityFilter.toLowerCase());

                const response = await fetch(`${API_BASE_URL}/incidents?${params.toString()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.status === 401) {
                    console.error("Session expired (401). Logging out...");
                    logout();
                    return;
                }

                if (response.ok) {
                    const data = await response.json();
                    setIncidents(data);
                }
            } catch (error) {
                console.error('Failed to fetch incidents:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchIncidents();
        const interval = setInterval(fetchIncidents, 10000); // Polling every 10s
        return () => clearInterval(interval);
    }, [debouncedSearch, statusFilter, priorityFilter, token, logout]);

    const resetFilters = () => {
        setSearch('')
        setStatusFilter('All')
        setPriorityFilter('All')
    }

    const hasActiveFilters = search || statusFilter !== 'All' || priorityFilter !== 'All';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-screen pb-20">
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

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldAlert className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-bold uppercase text-primary tracking-widest">Response Terminal</span>
                        <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest">Team 31</Badge>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Incident Response</h1>
                    <p className="text-muted-foreground font-medium text-sm">Monitor and resolve mission-critical grid infrastructure anomalies.</p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" className="rounded-lg h-10 px-4 border-border bg-background text-foreground font-bold text-xs uppercase tracking-widest hover:bg-muted transition-all">
                        <History className="mr-2 h-4 w-4" /> Archives
                    </Button>
                    <Button className="rounded-lg h-10 px-4 font-bold text-xs uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white shadow-sm">
                        <Plus className="mr-2 h-4 w-4" /> New Incident
                    </Button>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border border-border shadow-sm">
                <div className="flex flex-1 flex-col md:flex-row gap-4 w-full">
                    {/* Search */}
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="SEARCH INCIDENTS..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-10 text-xs font-medium uppercase tracking-wider"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[160px] h-10 text-xs font-bold uppercase tracking-wider">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Statuses</SelectItem>
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="AI analysis">AI Analysis</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Resolved">Resolved</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                            <SelectTrigger className="w-[160px] h-10 text-xs font-bold uppercase tracking-wider">
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Priorities</SelectItem>
                                <SelectItem value="Low">Low</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Critical">Critical</SelectItem>
                            </SelectContent>
                        </Select>

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetFilters}
                                className="h-10 px-3 text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                                <X className="h-4 w-4 mr-2" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Reset</span>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground whitespace-nowrap">
                    <Zap className="h-3 w-3 text-primary" />
                    <span className="uppercase tracking-wider font-bold">{incidents.length} Active Nodes</span>
                </div>
            </div>

            {/* Main Table Area */}
            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="border-border hover:bg-transparent uppercase tracking-wider">
                            <TableHead className="text-muted-foreground font-bold text-[10px] pl-6 w-[140px]">INCIDENT ID</TableHead>
                            <TableHead className="text-muted-foreground font-bold text-[10px]">DESCRIPTION</TableHead>
                            <TableHead className="text-muted-foreground font-bold text-[10px] w-[140px]">STATUS</TableHead>
                            <TableHead className="text-muted-foreground font-bold text-[10px] w-[140px]">PRIORITY</TableHead>
                            <TableHead className="text-muted-foreground font-bold text-[10px] w-[140px]">SOURCE</TableHead>
                            <TableHead className="text-muted-foreground font-bold text-[10px] w-[160px]">DETECTED</TableHead>
                            <TableHead className="text-right pr-6 text-muted-foreground font-bold text-[10px] w-[100px]">ACTIONS</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="h-5 w-5 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Scanning Grid...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : incidents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground font-medium text-sm">
                                    No incidents found matching your criteria.
                                </TableCell>
                            </TableRow>
                        ) : (
                            incidents.map((incident) => (
                                <TableRow key={incident.id} className="border-border hover:bg-muted/30 transition-colors group">
                                    <TableCell className="pl-6 py-4 font-mono text-xs font-bold">
                                        {incident.id}
                                    </TableCell>
                                    <TableCell className="max-w-md">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-foreground truncate">{incident.title}</span>
                                            <span className="text-xs text-muted-foreground truncate opacity-70">{incident.summary}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "rounded text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 border transition-all",
                                            incident.status === 'New' ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                                                incident.status === 'AI analysis' ? "bg-purple-500/10 text-purple-600 border-purple-500/20" :
                                                    incident.status === 'In Progress' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                                                        "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                        )}>
                                            {incident.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                incident.priority === 'Critical' ? "bg-rose-600 animate-pulse" :
                                                    incident.priority === 'High' ? "bg-rose-400" :
                                                        incident.priority === 'Medium' ? "bg-amber-500" :
                                                            "bg-emerald-500"
                                            )} />
                                            <span className={cn(
                                                "text-[10px] font-bold uppercase tracking-widest",
                                                incident.priority === 'Critical' ? "text-rose-600" :
                                                    incident.priority === 'High' ? "text-rose-400" :
                                                        incident.priority === 'Medium' ? "text-amber-500" :
                                                            "text-emerald-600"
                                            )}>
                                                {incident.priority}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="rounded text-[9px] font-bold uppercase tracking-widest px-2 py-0.5">
                                            {incident.contact_type === 'iot' ? 'IOT SENSOR' : 'USER'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            <span className="font-mono text-[10px] font-bold">
                                                {new Date(incident.createdAt).toLocaleDateString()} {new Date(incident.createdAt).toLocaleTimeString([], { hour12: false })}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Sheet>
                                            <SheetTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setSelectedIncident(incident)}
                                                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                                                >
                                                    <ArrowUpRight className="h-4 w-4" />
                                                </Button>
                                            </SheetTrigger>
                                            <SheetContent className="sm:max-w-2xl bg-background border-border text-foreground p-0 overflow-y-auto no-scrollbar rounded-lg">
                                                {selectedIncident && (
                                                    <div className="p-8 space-y-10">
                                                        <SheetHeader>
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <div className="p-2 rounded-lg bg-primary/5 border border-primary/10">
                                                                    <FileText className="h-5 w-5 text-primary" />
                                                                </div>
                                                                <Badge variant="outline" className="rounded text-[10px] font-bold border-primary text-primary">CASE #{selectedIncident.id}</Badge>
                                                            </div>
                                                            <SheetTitle className="text-3xl font-bold tracking-tight uppercase leading-tight">{selectedIncident.title}</SheetTitle>
                                                            <SheetDescription className="text-sm font-medium text-muted-foreground mt-2">{selectedIncident.summary}</SheetDescription>
                                                        </SheetHeader>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <Card className="bg-slate-50 dark:bg-slate-800/50 border-border rounded-lg p-6">
                                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">ServiceNow Protocol</p>
                                                                <p className="font-mono text-lg font-bold text-foreground">{selectedIncident.serviceNowId}</p>
                                                            </Card>
                                                            <Card className="bg-slate-50 dark:bg-slate-800/50 border-border rounded-lg p-6">
                                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Sync Status</p>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                                    <Badge className="bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest">STABLE RELAY</Badge>
                                                                </div>
                                                            </Card>
                                                        </div>

                                                        <div className="space-y-6">
                                                            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                                                                <Zap className="h-4 w-4 text-primary" /> Neural Analysis Results
                                                            </h3>
                                                            <div className="space-y-4">
                                                                {selectedIncident.agentAnalysis && selectedIncident.agentAnalysis.length > 0 ? (
                                                                    selectedIncident.agentAnalysis.map((analysis, i: number) => (
                                                                        <div key={i} className="p-6 rounded-lg bg-slate-50 dark:bg-slate-800/50 group relative border border-border/50 hover:border-primary/30 transition-all">
                                                                            <div className="flex items-center justify-between mb-3">
                                                                                <span className="text-xs font-bold text-primary uppercase tracking-widest">{analysis.agentName}</span>
                                                                                <span className="text-[10px] font-mono text-muted-foreground">{new Date(analysis.timestamp).toLocaleTimeString()}</span>
                                                                            </div>
                                                                            <p className="text-sm font-medium text-foreground leading-relaxed">{analysis.content}</p>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="p-12 border border-dashed border-border rounded-lg flex flex-col items-center justify-center text-center space-y-3 bg-muted/5">
                                                                        <div className="p-3 bg-muted/10 rounded-full">
                                                                            <Zap className="h-6 w-6 text-muted-foreground opacity-20" />
                                                                        </div>
                                                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest italic">Scanning grid nodes&apos;...</p>
                                                                        <p className="text-[10px] text-muted-foreground/60 uppercase">Deep analysis in progress. Please hold.</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </SheetContent>
                                        </Sheet>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
