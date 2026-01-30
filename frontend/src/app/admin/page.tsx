"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import Cookies from 'js-cookie'
import {
    Bot,
    Layers,
    AlertCircle,
    ShieldCheck,
    Cpu,
    Globe,
    Plus,
    Brain,
    Activity,
    Terminal,
    Zap,
    Search,
    Bell,
    Settings as SettingsIcon,
    ChevronRight,
    ArrowUpRight,
    TrendingUp,
    Download,
    BarChart3,
    Clock,
    Sparkles,
    RefreshCcw
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn, getAuthToken } from "@/lib/utils"
// Recharts
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts';

interface IncidentStats {
    total: number;
    open: number;
    resolved: number;
    critical: number;
    avg_resolution_time_hours: number;
    efficiency: {
        ai_resolution_rate: number;
        human_resolution_rate: number;
        ai_avg_time: string;
        human_avg_time: string;
    };
    distributions: {
        priority: Record<string, number>;
        status: Record<string, number>;
        category: Record<string, number>;
    };
    timeline: { date: string; count: number }[];
    heatmap: { day: string; hour: string; value: number }[];
    insights: { type: string; title: string; message: string; action: string }[];
}

import { useRoleAccess } from "@/hooks/useRoleAccess"

export default function AdminDashboard() {
    const { isAuthorized, isLoading: authLoading } = useRoleAccess(['admin']);
    const [stats, setStats] = useState<IncidentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const { token: authContextToken } = useAuth();

    const fetchStats = async (forceRefresh = false) => {
        try {
            if (forceRefresh) setRefreshing(true);
            else if (!stats) setLoading(true);

            const token = getAuthToken();
            const headers: Record<string, string> = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };

            const url = forceRefresh ? '/api/admin/stats/incidents?refresh=true' : '/api/admin/stats/incidents';
            const res = await fetch(url, { headers });

            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.error("Failed to fetch stats", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (authLoading || !isAuthorized) return;
        fetchStats();
    }, [authContextToken, authLoading, isAuthorized]);

    const handleDownloadReport = async () => {
        try {
            const token = authContextToken || (typeof window !== 'undefined' ? Cookies.get('auth_token') : null);
            const headers: Record<string, string> = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const res = await fetch('/api/admin/reports/incidents/analysis', { headers });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `incident_analysis_${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            }
        } catch (e) {
            console.error("Download failed", e);
        }
    }

    if (authLoading || (loading && !stats)) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">
                        Verifying Clearance Level...
                    </p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) return null;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    }

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
    const priorityData = stats ? Object.entries(stats.distributions.priority).map(([name, value]) => ({ name, value })) : [];
    const statusData = stats ? Object.entries(stats.distributions.status).map(([name, value]) => ({ name, value })) : [];

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8 font-sans selection:bg-primary/30 relative">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 dark:opacity-40 brightness-100 contrast-150" />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative z-10 max-w-[1600px] mx-auto space-y-8"
            >
                {/* Header section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
                    <div className="space-y-2">
                        <motion.div variants={itemVariants} className="flex items-center gap-2">
                            <div className="flex items-center justify-center p-1.5 rounded-md bg-primary/10 border border-primary/20">
                                <Cpu className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-[10px] font-bold uppercase text-primary tracking-[0.2em]">System Core // Operations</span>
                            <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 text-[8px] font-black uppercase tracking-widest">Live</Badge>
                        </motion.div>
                        <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground uppercase italic leading-none">
                            Admin <span className="text-primary NOT-italic">Dashboard</span>
                        </motion.h1>
                        <motion.p variants={itemVariants} className="text-muted-foreground font-medium max-w-2xl text-sm md:text-base">
                            Real-time AI surveillance and incident analytics platform.
                        </motion.p>
                    </div>

                    <motion.div variants={itemVariants} className="flex items-center gap-3">
                        <Button
                            onClick={() => fetchStats(true)}
                            disabled={refreshing}
                            variant="outline"
                            className="h-11 px-6 rounded-lg font-bold text-xs uppercase tracking-widest bg-card hover:bg-muted text-foreground border border-border shadow-sm transition-all group"
                        >
                            <RefreshCcw className={cn("mr-2 h-4 w-4 text-primary transition-transform", refreshing && "animate-spin")} />
                            {refreshing ? "Refreshing..." : "Refresh Intelligence"}
                        </Button>
                        <Button
                            onClick={handleDownloadReport}
                            className="h-11 px-6 rounded-lg font-bold text-xs uppercase tracking-widest bg-card hover:bg-muted text-foreground border border-border shadow-sm transition-all group"
                        >
                            <Download className="mr-2 h-4 w-4 text-blue-500 group-hover:translate-y-1 transition-transform" />
                            Generate Report
                        </Button>
                        <Link href="/admin/workflows">
                            <Button className="h-11 px-6 rounded-lg font-bold text-xs uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all group">
                                <Layers className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                                Workflows
                            </Button>
                        </Link>
                    </motion.div>
                </div>


                {/* Primary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Incidents', value: stats?.total ?? '-', sub: 'Lifetime Volume', icon: Bot, color: 'text-blue-500', glow: 'shadow-blue-500/5', href: '/incidents' },
                        { label: 'Critical Items', value: stats?.critical ?? '-', sub: 'Requires Attention', icon: AlertCircle, color: 'text-red-500', glow: 'shadow-red-500/5', href: '/incidents?priority=high' },
                        { label: 'Active Resolution', value: `${stats?.efficiency.ai_resolution_rate ?? 0}%`, sub: 'AI Autonomy Rate', icon: Brain, color: 'text-purple-500', glow: 'shadow-purple-500/5', href: '#' },
                        { label: 'Avg Closure Time', value: stats ? `${stats.avg_resolution_time_hours}h` : '-', sub: 'Mean Time to Resolve', icon: Clock, color: 'text-emerald-500', glow: 'shadow-emerald-500/5', href: '#' },
                    ].map((metric, i) => (
                        <motion.div key={i} variants={itemVariants}>
                            <Link href={metric.href}>
                                <Card className={cn(
                                    "relative overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-500 group cursor-pointer backdrop-blur-xl rounded-lg shadow-sm h-full",
                                    metric.glow
                                )}>
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <metric.icon className="h-12 w-12" />
                                    </div>
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className={cn("p-2.5 rounded-lg bg-muted border border-border group-hover:scale-110 transition-transform duration-500", metric.color)}>
                                                <metric.icon className="h-5 w-5" />
                                            </div>
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                                        </div>
                                        <div className="space-y-1 relative z-10">
                                            <h3 className="text-2xl font-black text-foreground tracking-tight group-hover:translate-x-1 transition-transform">{metric.value}</h3>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">{metric.label}</p>
                                            <div className="flex items-center gap-1.5 mt-2">
                                                <div className="h-[1px] flex-1 bg-border" />
                                                <p className="text-[9px] text-muted-foreground/60 font-bold italic">{metric.sub}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent w-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Card>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Timeline Area Chart */}
                    <motion.div variants={itemVariants} className="space-y-4">
                        <Card className="bg-card border-border backdrop-blur-2xl rounded-lg h-[400px] flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <TrendingUp className="h-5 w-5 text-primary" /> Incident Trend (7 Days)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 min-h-0 pb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats?.timeline || []}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                                        />
                                        <Area type="monotone" dataKey="count" stroke="#10b981" fillOpacity={1} fill="url(#colorCount)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Distributions Charts */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="bg-card border-border backdrop-blur-2xl rounded-lg h-[400px] flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-lg">Priority Split</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 min-h-0 flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={priorityData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {priorityData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border backdrop-blur-2xl rounded-lg h-[400px] flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-lg">Status Flow</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={statusData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={80} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                                        <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.2)' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }} />
                                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Heatmap Section */}
                    <motion.div variants={itemVariants} className="col-span-full lg:col-span-2">
                        <Card className="bg-card border-border backdrop-blur-2xl rounded-lg overflow-hidden h-[300px]">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-primary" /> Incident Intensity Heatmap
                                </CardTitle>
                                <CardDescription>Frequency of incidents by Day and Hour (UTC)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="w-full overflow-x-auto">
                                    <div className="min-w-[600px]">
                                        <div className="flex mb-2">
                                            <div className="w-12"></div>
                                            {Array.from({ length: 12 }).map((_, i) => (
                                                <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground">{i * 2}h</div>
                                            ))}
                                        </div>
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                            <div key={day} className="flex items-center mb-1">
                                                <div className="w-12 text-[10px] font-bold text-muted-foreground uppercase">{day}</div>
                                                {Array.from({ length: 12 }).map((_, h) => {
                                                    const hourKey = `${h * 2}:00`;
                                                    const point = stats?.heatmap.find(p => p.day === day && p.hour === hourKey.padStart(5, '0'));
                                                    const val = point?.value || 0;

                                                    // Color scale logic
                                                    let bg = "bg-muted/10";
                                                    if (val > 0) bg = "bg-emerald-500/20";
                                                    if (val > 2) bg = "bg-emerald-500/40";
                                                    if (val > 5) bg = "bg-emerald-500/60";
                                                    if (val > 10) bg = "bg-emerald-500/80";

                                                    return (
                                                        <div key={h} className="flex-1 px-0.5">
                                                            <div
                                                                className={cn("h-6 rounded-sm transition-all hover:scale-105 hover:ring-1 ring-primary relative group cursor-pointer", bg)}
                                                                title={`${day} @ ${hourKey}: ${val} incidents`}
                                                            >
                                                                {val > 0 && <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-foreground/70">{val}</span>}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* AI Insights Panel - RELOCATED TO BOTTOM */}
                {stats?.insights && stats.insights.length > 0 && (
                    <motion.div variants={itemVariants} className="space-y-4 pt-8 border-t border-border mt-12">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                                    <Brain className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black uppercase italic tracking-tight">AI Neural <span className="text-primary NOT-italic">Insights</span></h2>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Real-time Analysis Report</p>
                                </div>
                            </div>
                            <Button
                                onClick={() => fetchStats(true)}
                                disabled={refreshing}
                                size="sm"
                                variant="ghost"
                                className="h-8 px-3 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-primary/10 text-primary border border-primary/20 transition-all flex items-center gap-2"
                            >
                                <RefreshCcw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                                {refreshing ? "Refreshing..." : "Refresh Insights"}
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {stats.insights.map((insight, i) => (
                                <Card key={i} className="bg-gradient-to-br from-card to-muted/20 border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
                                    <CardContent className="p-4 flex flex-col justify-between h-full">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                                                <Sparkles className="h-3 w-3" />
                                                {insight.title}
                                            </div>
                                            <p className="text-sm text-foreground font-medium">{insight.message}</p>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-border/50 flex justify-end">
                                            <span className="text-[10px] font-bold uppercase text-muted-foreground cursor-pointer hover:text-primary flex items-center gap-1">
                                                {insight.action} <ChevronRight className="h-3 w-3" />
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </div>
    )
}
