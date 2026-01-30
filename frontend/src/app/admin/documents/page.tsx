"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus,
    Trash2,
    FileText,
    Search,
    Brain,
    ArrowLeft,
    Clock,
    Tag,
    ChevronRight,
    Loader2,
    Zap,
    Sparkles,
    Shield,
    Database,
    Cpu,
    X,
    Filter,
    Upload
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import Link from "next/link"
import { cn } from "@/lib/utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface KnowledgeDoc {
    id: string
    title: string
    content: string
    category: string
    created_at: string
}

export default function DocumentManagement() {
    const [docs, setDocs] = useState<KnowledgeDoc[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [isIndexing, setIsIndexing] = useState(false)

    const [newDoc, setNewDoc] = useState({
        title: "",
        content: "",
        category: "General"
    })
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    useEffect(() => { fetchDocs() }, [])

    const getAuthToken = () => document.cookie.split('auth_token=')[1]?.split(';')[0]

    const fetchDocs = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/documents`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            })
            if (res.ok) setDocs(await res.json())
        } catch (_) { toast.error("Failed to load document library") }
        finally { setLoading(false) }
    }

    const handleCreate = async () => {
        if (!newDoc.title || (!newDoc.content && !selectedFile)) {
            toast.error("All mission-critical fields must be populated")
            return
        }

        setIsIndexing(true)
        try {
            let res
            if (selectedFile) {
                const formData = new FormData()
                formData.append("title", newDoc.title)
                formData.append("category", newDoc.category)
                formData.append("file", selectedFile)

                res = await fetch(`${API_BASE_URL}/admin/documents/upload`, {
                    method: "POST",
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`
                    },
                    body: formData
                })
            } else {
                res = await fetch(`${API_BASE_URL}/admin/documents`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        'Authorization': `Bearer ${getAuthToken()}`
                    },
                    body: JSON.stringify(newDoc)
                })
            }

            if (res.ok) {
                toast.success("Knowledge synthesized successfully")
                setIsCreating(false)
                setNewDoc({ title: "", content: "", category: "General" })
                setSelectedFile(null)
                fetchDocs()
            } else {
                const error = await res.json()
                toast.error(error.detail || "Ingestion sequence failed")
            }
        } catch (_) { toast.error("Ingestion sequence failed") }
        finally { setIsIndexing(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Decommission this knowledge node?")) return
        try {
            const res = await fetch(`${API_BASE_URL}/admin/documents/${id}`, {
                method: "DELETE",
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            })
            if (res.ok) {
                toast.success("Document decommissioned")
                fetchDocs()
            }
        } catch (_) { toast.error("Decommission protocol failed") }
    }

    const filteredDocs = docs.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }

    const cardVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
    } as const

    const [inspectingDoc, setInspectingDoc] = useState<KnowledgeDoc | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editData, setEditData] = useState({ title: "", category: "", content: "" })

    const handleInspect = (doc: KnowledgeDoc) => {
        setInspectingDoc(doc)
        setEditData({ title: doc.title, category: doc.category, content: doc.content })
        setIsEditing(false)
    }

    const handleUpdate = async () => {
        if (!inspectingDoc) return
        try {
            const res = await fetch(`${API_BASE_URL}/admin/documents/${inspectingDoc.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify(editData)
            })
            if (res.ok) {
                toast.success("Knowledge node updated")
                setInspectingDoc(null)
                fetchDocs()
            }
        } catch (_) { toast.error("Update protocol failed") }
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-10 font-sans selection:bg-primary/30 relative">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-amber-500/5 rounded-lg blur-[150px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-lg blur-[120px]" />
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
                                Knowledge <span className="text-amber-500 NOT-italic">Base</span>
                                <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest">Team 31</Badge>
                            </motion.h1>
                            <p className="text-muted-foreground font-medium max-w-xl text-sm leading-relaxed">
                                Manage technical documentation and corpus data for the RAG Neural Engine.
                            </p>
                        </div>
                    </div>

                    <motion.div className="flex items-center gap-4">
                        <div className="flex items-center gap-4 px-6 py-3 rounded-lg bg-card border border-border backdrop-blur-md min-w-[300px] group focus-within:border-amber-500/50 transition-all shadow-sm">
                            <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-amber-500" />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Query neural index..."
                                className="bg-transparent border-none outline-none text-xs font-bold uppercase tracking-widest placeholder:text-muted-foreground/30 flex-1"
                            />
                        </div>
                        <Button
                            onClick={() => setIsCreating(true)}
                            className="h-12 px-8 rounded-lg font-black text-xs uppercase tracking-[0.2em] bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-lg transition-all group"
                        >
                            <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
                            Ingest Data
                        </Button>
                    </motion.div>
                </div>

                {/* Dashboard Stats (Small integration) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Total Index', value: docs.length, icon: Database, color: 'text-amber-500' },
                        { label: 'Neural Sync', value: 'Active', icon: Cpu, color: 'text-blue-500' },
                        { label: 'Grid Shield', value: 'Level 4', icon: Shield, color: 'text-emerald-500' }
                    ].map((stat, i) => (
                        <Card key={i} className="bg-card border-border rounded-lg overflow-hidden backdrop-blur-3xl shadow-sm">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                                    <h3 className="text-xl font-black text-foreground uppercase italic">{stat.value}</h3>
                                </div>
                                <div className={cn("p-3 rounded-lg bg-muted border border-border", stat.color)}>
                                    <stat.icon className="h-5 w-5" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Document Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="h-10 w-10 text-amber-500/50 animate-spin" />
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Synching Corpus...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                        <AnimatePresence mode="popLayout">
                            {filteredDocs.map((doc) => (
                                <motion.div
                                    key={doc.id}
                                    layout
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    whileHover={{ y: -5 }}
                                >
                                    <Card className="bg-card border-border hover:border-amber-500/30 transition-all duration-500 group overflow-hidden rounded-lg backdrop-blur-3xl relative h-full shadow-sm">
                                        <div className="absolute -top-4 -right-4 bg-amber-500/10 p-12 rounded-lg blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                        <div className="p-8 space-y-6 relative z-10">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-3">
                                                    <Badge variant="outline" className="text-[9px] font-black border-amber-500/20 text-amber-500 py-1 bg-amber-500/5 uppercase tracking-[0.2em]">
                                                        {doc.category}
                                                    </Badge>
                                                    <h3 className="text-2xl font-black text-foreground tracking-tighter uppercase line-clamp-1 group-hover:text-amber-400 transition-colors italic leading-none">
                                                        {doc.title}
                                                    </h3>
                                                </div>
                                                <Button
                                                    onClick={() => handleDelete(doc.id)}
                                                    variant="ghost"
                                                    className="h-10 w-10 rounded-lg border border-border hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground transition-all"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 px-1 italic">
                                                        <span>Neural Fragment</span>
                                                        <span>{doc.content.length} octets</span>
                                                    </div>
                                                    <div className="bg-muted/10 border border-border p-4 font-mono text-[10px] text-muted-foreground/60 leading-relaxed h-36 overflow-hidden relative select-none group-hover:bg-muted/20 transition-colors bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:12px_12px]">
                                                        {doc.content}
                                                        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card to-transparent opacity-90" />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-4 border-t border-border">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-muted border border-border">
                                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                                        </div>
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                                            {new Date(doc.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        onClick={() => handleInspect(doc)}
                                                        variant="ghost"
                                                        className="text-[9px] font-black uppercase text-amber-500/50 hover:text-amber-500 transition-all gap-1"
                                                    >
                                                        Inspect <ChevronRight className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredDocs.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-32 text-center space-y-6"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-amber-500/10 blur-3xl rounded-lg" />
                            <div className="w-24 h-24 bg-card border border-border rounded-lg flex items-center justify-center relative z-10 animate-pulse shadow-lg">
                                <FileText className="h-10 w-10 text-muted-foreground/30" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-foreground uppercase italic">Corpus Desolation</h3>
                            <p className="text-muted-foreground font-medium max-w-xs text-xs uppercase tracking-widest leading-relaxed">No documentation detected in the current query sector. Initialize ingestion sequence to proceed.</p>
                        </div>
                        <Button
                            variant="outline"
                            className="mt-4 border-border text-muted-foreground hover:text-foreground hover:bg-muted uppercase font-black text-[10px] tracking-widest h-12 px-6 rounded-lg transition-all shadow-sm"
                            onClick={() => setIsCreating(true)}
                        >
                            <Plus className="h-4 w-4 mr-2" /> Initial Ingestion
                        </Button>
                    </motion.div>
                )}
            </motion.div>

            {/* Ingestion Modal */}
            <AnimatePresence>
                {isCreating && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => !isIndexing && setIsCreating(false)}
                            className="absolute inset-0 bg-background/80 backdrop-blur-2xl"
                        />

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-card border border-border w-full max-w-xl rounded-lg shadow-2xl overflow-hidden relative"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-primary to-amber-500" />

                            <div className="p-8 space-y-6 bg-white dark:bg-[#0c0c0e]">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                                <Brain className="h-3 w-3 text-amber-500" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase text-amber-500 tracking-[0.2em]">Neural // Ingestion</span>
                                        </div>
                                        <h2 className="text-2xl font-black text-[#1a1a1a] dark:text-white uppercase italic tracking-tighter">DATA <span className="text-amber-500 NOT-italic">SYNC</span></h2>
                                    </div>
                                    <Button
                                        disabled={isIndexing}
                                        onClick={() => setIsCreating(false)}
                                        variant="ghost"
                                        className="h-10 w-10 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1 opacity-60">MISSION ASSET NAME</label>
                                            <Input
                                                disabled={isIndexing}
                                                value={newDoc.title}
                                                onChange={e => setNewDoc({ ...newDoc, title: e.target.value })}
                                                placeholder="Asset Name"
                                                className="h-12 bg-[#f8f9fa] dark:bg-muted/20 border-border rounded-lg px-4 font-bold text-xs focus:ring-amber-500/30"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1 opacity-60">CATEGORY</label>
                                            <Input
                                                disabled={isIndexing}
                                                value={newDoc.category}
                                                onChange={e => setNewDoc({ ...newDoc, category: e.target.value })}
                                                placeholder="General"
                                                className="h-12 bg-[#f8f9fa] dark:bg-muted/20 border-border rounded-lg px-4 font-bold text-xs focus:ring-amber-500/30"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1 opacity-60">SOURCE DATA</label>
                                            <div className="relative group">
                                                <Textarea
                                                    disabled={isIndexing || !!selectedFile}
                                                    value={newDoc.content}
                                                    onChange={e => setNewDoc({ ...newDoc, content: e.target.value })}
                                                    rows={6}
                                                    placeholder="Paste raw data here..."
                                                    className={cn(
                                                        "bg-[#f8f9fa] dark:bg-muted/10 border-border rounded-lg p-4 font-mono text-[11px] leading-relaxed resize-none focus:ring-amber-500/30",
                                                        selectedFile && "opacity-30 grayscale pointer-events-none"
                                                    )}
                                                />
                                                {selectedFile && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-background/10 backdrop-blur-[1px] rounded-lg">
                                                        <Badge className="bg-amber-500 text-white border-none py-1 px-3 rounded-lg uppercase tracking-widest text-[8px]">File Attachment Active</Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="relative py-2">
                                            <div className="absolute inset-0 flex items-center">
                                                <span className="w-full border-t border-border/30" />
                                            </div>
                                            <div className="relative flex justify-center text-[8px] uppercase font-black tracking-[0.2em] text-muted-foreground/30 bg-white dark:bg-[#0c0c0e] px-2">OR EXTRACT FROM ARTIFACT</div>
                                        </div>

                                        <div className="space-y-2">
                                            <input
                                                type="file"
                                                id="file-upload"
                                                className="hidden"
                                                accept=".pdf,.txt,.docx,.pptx"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0] || null;
                                                    setSelectedFile(file);
                                                    if (file) {
                                                        const nameWithoutExt = file.name.split('.').slice(0, -1).join('.') || file.name;
                                                        // Proactive naming: Format nicely (Title Case)
                                                        const formattedName = nameWithoutExt
                                                            .replace(/[^a-zA-Z0-9]/g, ' ')
                                                            .split(' ')
                                                            .filter(Boolean)
                                                            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                                                            .join(' ');

                                                        setNewDoc(prev => ({ ...prev, title: formattedName }));
                                                        toast.info(`Identified Document: ${formattedName}`);
                                                    }
                                                }}
                                            />
                                            <label
                                                htmlFor="file-upload"
                                                className={cn(
                                                    "flex items-center gap-4 p-4 rounded-lg border border-dashed border-border hover:border-amber-500/30 hover:bg-amber-500/[0.01] transition-all cursor-pointer group/upload",
                                                    selectedFile && "border-amber-500 bg-amber-500/5"
                                                )}
                                            >
                                                {selectedFile ? (
                                                    <div className="flex items-center gap-3 w-full">
                                                        <div className="p-2 rounded-lg bg-amber-500 text-white">
                                                            <FileText className="h-4 w-4" />
                                                        </div>
                                                        <div className="flex-1 overflow-hidden">
                                                            <p className="text-[11px] font-black text-foreground truncate">{selectedFile.name}</p>
                                                            <p className="text-[8px] font-bold text-muted-foreground uppercase">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • READY</p>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 hover:bg-rose-500/10 hover:text-rose-500"
                                                            onClick={(e) => { e.preventDefault(); setSelectedFile(null); }}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center w-full py-2 gap-2">
                                                        <Upload className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Select Neural Asset (PDF/DOCX/TXT)</p>
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-center pt-4">
                                    <Button
                                        disabled={isIndexing || (!newDoc.content && !selectedFile) || !newDoc.title}
                                        onClick={handleCreate}
                                        className="h-14 w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-[0.1em] text-[10px] shadow-lg group relative overflow-hidden transition-all disabled:opacity-50"
                                    >
                                        <AnimatePresence mode="wait">
                                            {isIndexing ? (
                                                <motion.div
                                                    key="loading"
                                                    initial={{ y: 10, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    exit={{ y: -10, opacity: 0 }}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    SYNCHRONIZING...
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="static"
                                                    initial={{ y: 10, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    exit={{ y: -10, opacity: 0 }}
                                                    className="flex items-center gap-2"
                                                >
                                                    INITIALIZE SYNC <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        {isIndexing && (
                                            <motion.div
                                                className="absolute inset-0 bg-white/10"
                                                initial={{ x: "-100%" }}
                                                animate={{ x: "100%" }}
                                                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                            />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Inspection Modal */}
            <AnimatePresence>
                {inspectingDoc && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setInspectingDoc(null)}
                            className="absolute inset-0 bg-background/80 backdrop-blur-2xl"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-card border border-border w-full max-w-4xl rounded-lg shadow-2xl overflow-hidden relative"
                        >
                            <div className="p-10 md:p-12 space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-4 flex-1">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 uppercase tracking-widest text-[10px]">Neural Artifact</Badge>
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">ID: {inspectingDoc.id}</span>
                                        </div>
                                        {isEditing ? (
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input
                                                    value={editData.title}
                                                    onChange={e => setEditData({ ...editData, title: e.target.value })}
                                                    className="text-2xl font-black h-12 rounded-lg bg-muted/50 border-border"
                                                />
                                                <Input
                                                    value={editData.category}
                                                    onChange={e => setEditData({ ...editData, category: e.target.value })}
                                                    className="text-lg font-bold h-12 rounded-lg bg-muted/50 border-border"
                                                />
                                            </div>
                                        ) : (
                                            <h2 className="text-4xl font-black text-foreground uppercase italic tracking-tighter leading-none border-l-4 border-amber-500 pl-6">{inspectingDoc.title}</h2>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isEditing ? (
                                            <Button onClick={handleUpdate} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg h-12 px-6 font-black uppercase tracking-widest text-[10px]">Commit Changes</Button>
                                        ) : (
                                            <Button onClick={() => setIsEditing(true)} variant="outline" className="border-border hover:bg-muted rounded-lg h-12 px-6 font-black uppercase tracking-widest text-[10px]">Initialize Edit</Button>
                                        )}
                                        <Button onClick={() => setInspectingDoc(null)} variant="ghost" className="h-12 w-12 rounded-lg hover:bg-muted text-muted-foreground"><X className="h-6 w-6" /></Button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 italic">
                                        <span>Raw Node Data</span>
                                        <span>Last Modified: {new Date(inspectingDoc.created_at).toLocaleString()}</span>
                                    </div>
                                    {isEditing ? (
                                        <Textarea
                                            value={editData.content}
                                            onChange={e => setEditData({ ...editData, content: e.target.value })}
                                            rows={15}
                                            className="bg-muted/30 border-border rounded-lg p-8 font-mono text-sm leading-relaxed resize-none focus:ring-amber-500/30"
                                        />
                                    ) : (
                                        <div className="bg-muted/10 border border-border rounded-lg p-10 font-mono text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap select-text bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px]">
                                            {inspectingDoc.content}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-6 pt-4 border-t border-border/50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-lg bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Node Synced</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Database className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vector: QDRANT LATEST</span>
                                    </div>
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
