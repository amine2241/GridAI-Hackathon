"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ChevronRight,
    Search,
    UserCircle,
    ArrowLeft,
    Shield,
    ShieldCheck,
    Briefcase,
    Zap,
    Activity,
    Users,
    Mail,
    Lock,
    Cpu,
    Filter,
    MoreHorizontal
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/config"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Workflow {
    id: string
    name: string
}

interface User {
    id: string
    email: string
    role: string
    workflow_id: string | null
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [workflows, setWorkflows] = useState<Workflow[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    useEffect(() => {
        Promise.all([fetchUsers(), fetchWorkflows()]).finally(() => setLoading(false))
    }, [])

    const getAuthToken = () => document.cookie.split('auth_token=')[1]?.split(';')[0]

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            })
            if (res.ok) setUsers(await res.json())
        } catch { toast.error("Failed to load operator database") }
    }

    const fetchWorkflows = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/workflows`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            })
            if (res.ok) setWorkflows(await res.json())
        } catch { }
    }

    const updateUser = async (userId: string, data: Partial<User>) => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
                method: "PATCH",
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            if (res.ok) {
                toast.success("Personnel record updated")
                fetchUsers()
            }
        } catch { toast.error("Credential update failed") }
    }

    const filteredUsers = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()))

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    }

    if (loading) return (
        <div className="min-h-screen bg-background flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.5em] text-primary animate-pulse">
            Scanning Operator Database...
        </div>
    )

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-10 font-sans selection:bg-primary/30 relative">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] bg-purple-500/5 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 dark:opacity-40 brightness-100 contrast-150" />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="relative z-10 max-w-7xl mx-auto space-y-12"
            >
                {/* Header section with back link */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-border">
                    <div className="space-y-4">
                        <Link href="/admin">
                            <motion.button
                                whileHover={{ x: -4 }}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
                            >
                                <ArrowLeft className="h-3 w-3" /> Back to Command Center
                            </motion.button>
                        </Link>
                        <div className="space-y-1">
                            <motion.h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground uppercase italic leading-none">
                                Personnel <span className="text-purple-500 NOT-italic">Directory</span>
                                <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest">Team 31</Badge>
                            </motion.h1>
                            <p className="text-muted-foreground font-medium max-w-xl text-sm leading-relaxed">
                                Manage operator credentials and assign cognitive workflow nodes within the enterprise grid.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-4 px-6 py-4 rounded-lg bg-card border border-border backdrop-blur-md flex-1 min-w-[300px] group focus-within:border-purple-500/50 transition-all shadow-sm">
                        <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-purple-500" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Identify personnel via email..."
                            className="bg-transparent border-none outline-none text-xs font-bold uppercase tracking-widest placeholder:text-muted-foreground/30 flex-1"
                        />
                    </div>
                    <Button variant="outline" className="h-14 px-8 rounded-lg border-border text-muted-foreground hover:text-foreground uppercase font-black text-[10px] tracking-widest transition-all gap-2 bg-card shadow-sm">
                        <Filter className="h-4 w-4" /> Filter Results
                    </Button>
                </div>

                {/* User Table/Cards */}
                <div className="space-y-4 pb-20">
                    <AnimatePresence mode="popLayout">
                        {filteredUsers.map((user) => (
                            <motion.div
                                key={user.id}
                                layout
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                exit={{ scale: 0.95, opacity: 0 }}
                            >
                                <Card className="bg-card border-border hover:border-purple-500/30 transition-all duration-300 group overflow-hidden rounded-lg backdrop-blur-3xl relative shadow-sm">
                                    <CardContent className="p-0">
                                        <div className="flex flex-col lg:flex-row lg:items-center">
                                            {/* Primary Info */}
                                            <div className="p-8 lg:flex-1 flex items-center gap-6 border-b lg:border-b-0 lg:border-r border-border">
                                                <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-purple-500/10 to-primary/10 border border-border flex items-center justify-center relative shadow-inner">
                                                    <UserCircle className="h-6 w-6 text-purple-500" />
                                                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-background animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="text-lg font-black text-foreground tracking-tight flex items-center gap-3">
                                                        {user.email}
                                                        {user.role === 'admin' && (
                                                            <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-[8px] font-black uppercase tracking-widest leading-none py-1">
                                                                System Admin
                                                            </Badge>
                                                        )}
                                                    </h3>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                        <Activity className="h-3 w-3 text-emerald-500" /> Pulse: Online Verified // Node 0x{user.id.slice(0, 6)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Role Selection */}
                                            <div className="p-8 lg:w-48 flex items-center gap-4 border-b lg:border-b-0 lg:border-r border-border">
                                                <div className="space-y-2 w-full">
                                                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Access Level</label>
                                                    <Select
                                                        defaultValue={user.role}
                                                        onValueChange={val => updateUser(user.id, { role: val })}
                                                    >
                                                        <SelectTrigger className="h-10 bg-muted/30 border-border rounded-lg text-[10px] font-black uppercase tracking-widest hover:border-purple-500/50 transition-all">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-card border-border text-foreground rounded-lg shadow-xl">
                                                            <SelectItem value="user" className="hover:bg-muted focus:bg-muted uppercase text-[10px] font-black tracking-widest">Normal User</SelectItem>
                                                            <SelectItem value="admin" className="hover:bg-muted focus:bg-muted uppercase text-[10px] font-black tracking-widest text-purple-500">System Admin</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {/* Workflow Assignment */}
                                            <div className="p-8 lg:flex-1 min-w-[240px] flex items-center gap-4 border-b lg:border-b-0 lg:border-r border-border">
                                                <div className="space-y-2 w-full">
                                                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Neural Persona Node</label>
                                                    <Select
                                                        defaultValue={user.workflow_id || "none"}
                                                        onValueChange={val => updateUser(user.id, { workflow_id: val === "none" ? null : val })}
                                                    >
                                                        <SelectTrigger className="h-10 bg-muted/30 border-border rounded-lg text-[10px] font-black uppercase tracking-widest hover:border-purple-500/50 transition-all">
                                                            <div className="flex items-center gap-2">
                                                                <Cpu className="h-3 w-3 text-purple-500" />
                                                                <SelectValue />
                                                            </div>
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-card border-border text-foreground rounded-lg max-h-[300px] shadow-xl">
                                                            <SelectItem value="none" className="hover:bg-muted focus:bg-muted uppercase text-[10px] font-black tracking-widest">Default System</SelectItem>
                                                            {workflows.map(wf => (
                                                                <SelectItem key={wf.id} value={wf.id} className="hover:bg-muted focus:bg-muted uppercase text-[10px] font-black tracking-widest italic">{wf.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {/* Audit Link */}
                                            <div className="p-8 lg:w-40 flex items-center justify-center">
                                                <Button variant="ghost" className="h-12 w-full rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all uppercase font-black text-[9px] tracking-widest gap-2 shadow-sm">
                                                    Audit <ChevronRight className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent w-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Empty State */}
                {filteredUsers.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-32 text-center space-y-6"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-purple-500/10 blur-3xl rounded-full" />
                            <div className="w-24 h-24 bg-card border border-border rounded-lg flex items-center justify-center relative z-10 animate-pulse shadow-lg">
                                <Users className="h-10 w-10 text-muted-foreground/30" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-foreground uppercase italic">Zero Match Detected</h3>
                            <p className="text-muted-foreground font-medium max-w-xs text-xs uppercase tracking-widest leading-relaxed">No operators found matching the current identification protocol.</p>
                        </div>
                    </motion.div>
                )}
            </motion.div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.01); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.05); border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.01); }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
            `}</style>
        </div>
    )
}
