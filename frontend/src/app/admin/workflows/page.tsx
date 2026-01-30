"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus,
    Save,
    Trash2,
    Settings as SettingsIcon,
    Play,
    ArrowLeft,
    Layers,
    Bot,
    Terminal,
    Zap,
    Cpu,
    Activity,
    ChevronRight,
    Search,
    X,
    Sparkles,
    Shield,
    Brain,
    AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/config"
import { cn } from "@/lib/utils"

interface Workflow {
    id: string
    name: string
    description: string
    config: Record<string, string>
}

export default function WorkflowsPage() {
    const [workflows, setWorkflows] = useState<Workflow[]>([])
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [currentWF, setCurrentWF] = useState<Partial<Workflow>>({
        name: "",
        description: "",
        config: {
            "agent-support": "",
            "agent-rag": "",
            "agent-ticket": "",
            "agent-analyze": ""
        }
    })

    useEffect(() => { fetchWorkflows() }, [])

    const getAuthToken = () => document.cookie.split('auth_token=')[1]?.split(';')[0]

    const fetchWorkflows = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/workflows`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            })
            if (res.ok) setWorkflows(await res.json())
        } catch (_) { toast.error("Failed to load neural library") }
        finally { setLoading(false) }
    }

    const handleSave = async () => {
        if (!currentWF.name) return toast.error("Node Identifier required")
        try {
            const isUpdate = !!currentWF.id
            const method = isUpdate ? "PATCH" : "POST"
            const url = isUpdate ? `${API_BASE_URL}/admin/workflows/${currentWF.id}` : `${API_BASE_URL}/admin/workflows`

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(currentWF)
            })
            if (res.ok) {
                toast.success(isUpdate ? "GRID updated" : "Persona node initialized")
                setIsEditing(false)
                fetchWorkflows()
            }
        } catch (_) { toast.error("Transmission failure") }
    }

    const deleteWF = async (id: string) => {
        if (!confirm("Decommission this node?")) return
        try {
            const res = await fetch(`${API_BASE_URL}/admin/workflows/${id}`, {
                method: "DELETE",
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            })
            if (res.ok) {
                toast.success("Node decommissioned")
                fetchWorkflows()
            }
        } catch (_) { toast.error("Decommission protocol failed") }
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }

    const cardVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
    } as const

    if (loading) return (
        <div className="min-h-screen bg-background flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.5em] text-primary animate-pulse">
            Initializing Neural Library...
        </div>
    )

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-10 font-sans selection:bg-primary/30 relative">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/5 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
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
                                Workflow <span className="text-emerald-500 NOT-italic">Engine</span>
                                <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest">Team 31</Badge>
                            </motion.h1>
                            <p className="text-muted-foreground font-medium max-w-xl text-sm leading-relaxed">
                                Define dynamic personas and neural constraints for simulated agents within the grid.
                            </p>
                        </div>
                    </div>

                    <motion.div className="flex items-center gap-4">
                        <div className="hidden lg:flex items-center gap-4 px-4 py-2 rounded-lg bg-card border border-border backdrop-blur-md shadow-sm">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Filter neural logs..."
                                className="bg-transparent border-none outline-none text-xs font-bold uppercase tracking-widest placeholder:text-muted-foreground/50 w-32"
                            />
                        </div>
                        <Button
                            onClick={() => {
                                setCurrentWF({
                                    name: "",
                                    description: "",
                                    config: {
                                        "agent-support": "",
                                        "agent-rag": "",
                                        "agent-ticket": "",
                                        "agent-analyze": ""
                                    }
                                })
                                setIsEditing(true)
                            }}
                            className="h-12 px-8 rounded-lg font-black text-xs uppercase tracking-[0.2em] bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-lg transition-all group"
                        >
                            <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
                            Initialize New Node
                        </Button>
                    </motion.div>
                </div>

                {/* Workflow Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AnimatePresence mode="popLayout">
                        {workflows.map((wf) => (
                            <motion.div
                                key={wf.id}
                                layout
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                                exit={{ scale: 0.8, opacity: 0 }}
                                whileHover={{ y: -5 }}
                            >
                                <Card className="bg-card border-border hover:border-emerald-500/30 transition-all duration-500 group overflow-hidden rounded-lg backdrop-blur-3xl relative h-full shadow-sm">
                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Layers className="h-24 w-24" />
                                    </div>

                                    <div className="p-8 space-y-6 relative z-10">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-3">
                                                <Badge variant="outline" className="text-[9px] font-black border-emerald-500/20 text-emerald-500 py-1 bg-emerald-500/5 uppercase tracking-widest">
                                                    Neural Persona 0x{wf.id.slice(0, 4)}
                                                </Badge>
                                                <h3 className="text-2xl font-black text-foreground tracking-tight uppercase group-hover:text-emerald-500 transition-colors">
                                                    {wf.name}
                                                </h3>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            </div>
                                        </div>

                                        <p className="text-muted-foreground text-sm font-medium line-clamp-2 leading-relaxed">
                                            {wf.description || "Experimental neural pathway defined."}
                                        </p>

                                        <div className="pt-4 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-muted border border-border group-hover:scale-110 transition-transform duration-500">
                                                    <Cpu className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Node: Hybrid System</span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    onClick={() => window.open(`/admin/chatbot?workflow=${wf.id}`, '_blank')}
                                                    className="flex-1 h-11 bg-muted hover:bg-emerald-500 hover:text-slate-900 border border-border text-foreground font-black text-[10px] uppercase tracking-widest rounded-lg transition-all gap-2 group/btn shadow-sm"
                                                >
                                                    <Play className="h-3 w-3 fill-current group-hover/btn:scale-125 transition-transform" /> NODE TEST
                                                </Button>
                                                <Button
                                                    onClick={() => { setCurrentWF(wf); setIsEditing(true); }}
                                                    variant="ghost"
                                                    className="h-11 w-11 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                                                >
                                                    <SettingsIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    onClick={() => deleteWF(wf.id)}
                                                    variant="ghost"
                                                    className="h-11 w-11 rounded-lg border border-border hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent w-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Empty State */}
                {workflows.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-32 text-center space-y-6"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                            <div className="w-24 h-24 bg-card border border-border rounded-lg flex items-center justify-center relative z-10 animate-bounce shadow-lg">
                                <Zap className="h-10 w-10 text-muted-foreground" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-foreground uppercase italic">Grid Link Offline</h3>
                            <p className="text-muted-foreground font-medium max-w-xs text-xs uppercase tracking-widest">No neural persona nodes detected in this sector.</p>
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {/* Neural Configuration Modal */}
            <AnimatePresence>
                {isEditing && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsEditing(false)}
                            className="absolute inset-0 bg-background/80 backdrop-blur-xl"
                        />

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-card border border-border w-full max-w-3xl rounded-lg shadow-2xl overflow-hidden relative"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-primary to-emerald-500" />

                            <div className="p-10 space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-md bg-emerald-500/20 border border-emerald-500/30">
                                                <Zap className="h-4 w-4 text-emerald-500" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.3em]">Protocol // Init Sequence</span>
                                        </div>
                                        <h2 className="text-3xl font-black text-foreground uppercase italic">Neural <span className="text-emerald-500">Config</span></h2>
                                    </div>
                                    <Button
                                        onClick={() => setIsEditing(false)}
                                        variant="ghost"
                                        className="h-12 w-12 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                                    >
                                        <X className="h-6 w-6" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Node Identifier</label>
                                        <Input
                                            value={currentWF.name}
                                            onChange={(e) => setCurrentWF({ ...currentWF, name: e.target.value })}
                                            className="h-14 bg-muted/30 border-border rounded-lg px-6 font-bold text-foreground placeholder:text-muted-foreground/30 focus:ring-emerald-500/50"
                                            placeholder="e.g. ALPHA_TRIAGE_OPS"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Operational Logic</label>
                                        <Input
                                            value={currentWF.description}
                                            onChange={(e) => setCurrentWF({ ...currentWF, description: e.target.value })}
                                            className="h-14 bg-muted/30 border-border rounded-lg px-6 font-bold text-foreground placeholder:text-muted-foreground/30 focus:ring-emerald-500/50"
                                            placeholder="Core mandate for this node..."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Terminal className="h-3 w-3" /> System Prompts Array
                                    </label>
                                    <div className="grid grid-cols-1 gap-4">
                                        {[
                                            { id: "agent-support", label: "Supervisor Agent", color: "text-blue-500", bg: "bg-blue-500/10" },
                                            { id: "agent-rag", label: "Knowledge Specialist", color: "text-purple-500", bg: "bg-purple-500/10" },
                                            { id: "agent-ticket", label: "Action Specialist", color: "text-emerald-500", bg: "bg-emerald-500/10" },
                                            { id: "agent-analyze", label: "Diagnostic AI", color: "text-rose-500", bg: "bg-rose-500/10" }
                                        ].map(agent => (
                                            <div key={agent.id} className="p-6 rounded-lg bg-muted/20 border border-border space-y-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", agent.bg.replace('/10', ''))} />
                                                        <span className={cn("text-[10px] font-black uppercase tracking-widest", agent.color)}>{agent.label}</span>
                                                    </div>
                                                    <span className="text-[8px] font-mono text-muted-foreground/50 uppercase tracking-tighter">{agent.id}</span>
                                                </div>
                                                <Textarea
                                                    value={currentWF.config?.[agent.id] || ""}
                                                    onChange={(e) => {
                                                        const newConfig = { ...currentWF.config, [agent.id]: e.target.value };
                                                        setCurrentWF({ ...currentWF, config: newConfig as Record<string, string> });
                                                    }}
                                                    className="min-h-[120px] bg-transparent border-none outline-none focus-visible:ring-0 p-0 text-xs text-muted-foreground font-medium resize-none leading-relaxed"
                                                    placeholder={`Neural instructions for ${agent.label}...`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-border">
                                    <Button
                                        onClick={handleSave}
                                        className="h-16 px-12 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black uppercase tracking-[0.2em] shadow-lg group transition-all"
                                    >
                                        Commence Integration <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.01); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.1); }
                .dark .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.01); }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
            `}</style>
        </div>
    )
}
