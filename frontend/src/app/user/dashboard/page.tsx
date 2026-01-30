'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Ticket,
    MessageSquare,
    Phone,
    Video,
    Zap,
    Activity,
    ShieldCheck,
    ArrowUpRight,
    Cpu,
    Layers,
    ChevronRight,
    Sparkles,
    Globe
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Cookies from 'js-cookie';

import { useRoleAccess } from '@/hooks/useRoleAccess';

export default function UserDashboard() {
    const { isAuthorized, isLoading: authLoading } = useRoleAccess(['user', 'admin']);
    const { user, token: authContextToken } = useAuth();
    const [statsData, setStatsData] = React.useState<{
        activeCount: number;
        totalCount: number;
        resolvedCount: number;
        efficiency: string;
        latestTicket: any;
        systemStatus: string;
    } | null>(() => {
        // Load from cache on init if available
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('dashboard_stats_cache');
            return cached ? JSON.parse(cached) : null;
        }
        return null;
    });

    // If we have cached data, we don't show the initial loading '...' flicker
    const [loading, setLoading] = React.useState(!statsData);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    React.useEffect(() => {
        if (authLoading || !isAuthorized) return;

        const fetchStats = async () => {
            try {
                // Use token from context (most reliable)
                const token = authContextToken || (typeof window !== 'undefined' ? Cookies.get('auth_token') : null);

                const res = await fetch(`${API_URL}/tickets/stats`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStatsData(data);
                    // Update cache
                    localStorage.setItem('dashboard_stats_cache', JSON.stringify(data));
                }
            } catch (e) {
                console.error("Failed to fetch dashboard stats", e);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [API_URL, authLoading, isAuthorized, authContextToken]);

    // Show loading state while checking auth
    if (authLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">Syncing Session...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) return null;


    const stats = [
        {
            name: 'Active Nodes',
            value: loading ? '...' : (statsData?.activeCount ?? '0'),
            icon: Ticket,
            color: 'text-blue-500',
            sub: 'Monitoring Live'
        },
        {
            name: 'Neural Footprint',
            value: loading ? '...' : (statsData?.totalCount ?? '0'),
            icon: Layers,
            color: 'text-amber-500',
            sub: 'Total Incidents'
        },
        {
            name: 'Neural Efficiency',
            value: loading ? '...' : (statsData?.efficiency ?? '100%'),
            icon: Zap,
            color: 'text-emerald-500',
            sub: `Status: ${statsData?.systemStatus ?? 'STABLE'}`
        },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8 font-sans selection:bg-primary/30 relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 dark:opacity-40 brightness-100 contrast-150" />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative z-10 max-w-7xl mx-auto space-y-12"
            >
                {/* Header section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-border">
                    <div className="space-y-4">
                        <motion.div variants={itemVariants} className="flex items-center gap-2">
                            <div className="flex items-center justify-center p-1.5 rounded-md bg-primary/10 border border-primary/20">
                                <Cpu className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-[10px] font-bold uppercase text-primary tracking-[0.2em]">User Nexus // Dashboard</span>
                            <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest">Team 31</Badge>
                        </motion.div>
                        <div className="space-y-1">
                            <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl font-black tracking-tighter text-foreground uppercase italic leading-none">
                                Welcome, <span className="text-primary NOT-italic">{user?.name}</span>
                            </motion.h1>
                            <motion.p variants={itemVariants} className="text-muted-foreground font-medium max-w-xl text-sm leading-relaxed">
                                Monitor your neural-linked infrastructure and access high-fidelity support nodes.
                            </motion.p>
                        </div>
                    </div>

                    {user?.role === 'admin' && (
                        <motion.div variants={itemVariants}>
                            <Link href="/admin">
                                <button className="h-14 px-8 bg-card hover:bg-muted text-foreground rounded-lg font-black flex items-center gap-3 transition-all shadow-xl border border-border text-[10px] uppercase tracking-[0.2em] backdrop-blur-xl group">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                                    Admin Portal Access
                                </button>
                            </Link>
                        </motion.div>
                    )}
                </div>

                {/* Primary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {stats.map((stat, i) => (
                        <motion.div key={stat.name} variants={itemVariants}>
                            <Card className="bg-card border-border rounded-lg overflow-hidden backdrop-blur-3xl group hover:border-primary/30 transition-all duration-500 shadow-sm">
                                <CardContent className="p-8 flex items-center gap-6">
                                    <div className={cn("p-4 rounded-lg bg-muted border border-border shadow-inner group-hover:scale-110 transition-transform duration-500", stat.color)}>
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.name}</p>
                                        <h3 className="text-2xl font-black text-foreground italic leading-none">{stat.value}</h3>
                                        <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">{stat.sub}</p>
                                    </div>
                                </CardContent>
                                <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent w-full opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Support Actions Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Support Card */}
                    <motion.div
                        variants={itemVariants}
                        className="lg:col-span-8 p-10 md:p-14 rounded-lg bg-gradient-to-br from-primary/10 via-card to-card border border-border backdrop-blur-3xl relative overflow-hidden group shadow-xl"
                    >
                        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-[120px] group-hover:scale-110 transition-transform duration-1000" />

                        <div className="relative z-10 space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Sparkles className="h-5 w-5 text-amber-500" />
                                    <h2 className="text-3xl font-black text-foreground uppercase italic tracking-tight leading-none">Need Assistance?</h2>
                                </div>
                                <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl font-medium">
                                    Our multi-agent system and high-tier engineering teams are synchronized 24/7 to resolve infrastructure anomalies across your grid.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-4 pt-4">
                                <Link href="/user/support?mode=chat">
                                    <button className="h-16 px-10 bg-primary hover:bg-primary/90 text-white rounded-lg font-black flex items-center gap-3 transition-all shadow-lg uppercase text-[10px] tracking-[0.2em] group/btn">
                                        <MessageSquare className="w-4 h-4 group-hover:scale-125 transition-transform" />
                                        Initialize Chat
                                    </button>
                                </Link>
                                <Link href="/user/support?mode=voice">
                                    <button className="h-16 px-10 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-black flex items-center gap-3 transition-all border border-border uppercase text-[10px] tracking-[0.2em] backdrop-blur-xl shadow-sm">
                                        <Phone className="w-4 h-4 text-emerald-500" />
                                        Voice Uplink
                                    </button>
                                </Link>
                                <Link href="/user/support?mode=video">
                                    <button className="h-16 px-10 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-black flex items-center gap-3 transition-all border border-border uppercase text-[10px] tracking-[0.2em] backdrop-blur-xl shadow-sm">
                                        < Video className="w-4 h-4 text-purple-500" />
                                        Visual Link
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </motion.div>

                    {/* Side Info Panel */}
                    <motion.div
                        variants={itemVariants}
                        className="lg:col-span-4 p-10 rounded-lg bg-card border border-border backdrop-blur-3xl shadow-xl flex flex-col justify-between space-y-8"
                    >
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-foreground uppercase italic">Active Trace</h2>
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[8px] font-black tracking-widest py-1 leading-none">LIVE SYNC</Badge>
                            </div>

                            {loading ? (
                                <div className="h-40 flex items-center justify-center border border-dashed border-border rounded-lg">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground animate-pulse">Syncing Trace...</p>
                                </div>
                            ) : statsData?.latestTicket ? (
                                <div className="p-6 rounded-lg bg-muted/30 border border-border hover:border-primary/30 transition-all group/item cursor-pointer">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                            <p className="font-black text-[10px] text-foreground tracking-widest uppercase">{statsData.latestTicket.id}</p>
                                        </div>
                                        <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover/item:text-primary transition-colors" />
                                    </div>
                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter mb-4 line-clamp-2">{statsData.latestTicket.title}</p>
                                    <Link href="/user/tickets">
                                        <Button variant="ghost" className="w-full h-10 rounded-lg bg-card border border-border text-[9px] font-black uppercase text-primary tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm">
                                            Track Resolution
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="h-40 flex flex-col items-center justify-center border border-dashed border-border rounded-lg text-center p-4">
                                    <Layers className="h-8 w-8 text-muted-foreground/20 mb-3" />
                                    <p className="text-[9px] font-black uppercase text-muted-foreground">No Active Traces Found</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-6 border-t border-border">
                            <div className="flex items-center justify-between text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                <span>Monthly Resolved</span>
                                <span className="text-foreground">{statsData?.resolvedCount ?? '0'} Units</span>
                            </div>
                            <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(((statsData?.resolvedCount ?? 0) / 20) * 100, 100)}%` }}
                                    className="h-full bg-primary"
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>


            </motion.div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.01); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.05); border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.01); }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
            `}</style>
        </div>
    );
}
