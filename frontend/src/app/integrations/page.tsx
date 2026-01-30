"use client"

import { useState, useEffect } from "react"
import {
    Database,
    ShieldCheck,
    RefreshCcw,
    Upload,
    FileText,
    Activity,
    Globe,
    Zap,
    Layers,
    CheckCircle2,
    AlertCircle,
    Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ChatWidget } from "@/components/chatbot/ChatWidget"
import { Integration } from "@/types"
import { API_BASE_URL } from "@/lib/config"
import Link from "next/link"

export default function IntegrationsPage() {
    const [integrations, setIntegrations] = useState<Integration[]>([])
    const [testingStates, setTestingStates] = useState<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({})
    const [testMessages, setTestMessages] = useState<Record<string, string>>({})

    // ServiceNow local config
    const [snConfig, setSnConfig] = useState({
        url: "https://capgemini.service-now.com",
        username: "admin",
        password: ""
    })

    // Tavily local config
    const [tavilyConfig, setTavilyConfig] = useState({
        api_key: ""
    })

    useEffect(() => {
        const fetchIntegrations = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/integrations`)
                if (response.ok) {
                    const data = await response.json()
                    setIntegrations(data)
                }
            } catch (error) {
                console.error('Failed to fetch integrations:', error)
            }
        }
        fetchIntegrations()
        const interval = setInterval(fetchIntegrations, 10000)
        return () => clearInterval(interval)
    }, [])

    const handleTestConnection = async (provider: string, config: any) => {
        setTestingStates(prev => ({ ...prev, [provider]: 'testing' }))
        setTestMessages(prev => ({ ...prev, [provider]: "" }))

        try {
            const response = await fetch(`${API_BASE_URL}/settings/test-connection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    ...config
                })
            })

            const result = await response.json()
            if (result.status === 'success') {
                setTestingStates(prev => ({ ...prev, [provider]: 'success' }))
                setTestMessages(prev => ({ ...prev, [provider]: result.message }))
                // Refresh integrations to show updated status
                const res = await fetch(`${API_BASE_URL}/integrations`)
                if (res.ok) setIntegrations(await res.json())
            } else {
                setTestingStates(prev => ({ ...prev, [provider]: 'error' }))
                setTestMessages(prev => ({ ...prev, [provider]: result.message }))
            }
        } catch (error) {
            setTestingStates(prev => ({ ...prev, [provider]: 'error' }))
            setTestMessages(prev => ({ ...prev, [provider]: "Network error occurred." }))
        }

        // Reset state after 5 seconds
        setTimeout(() => {
            setTestingStates(prev => ({ ...prev, [provider]: 'idle' }))
        }, 5000)
    }

    const getStatus = (id: string) => {
        const integration = integrations.find(i => i.id === id)
        return integration ? integration.status : "Checking..."
    }

    const getLatency = (id: string) => {
        const integration = integrations.find(i => i.id === id)
        return integration ? integration.latency : "--"
    }

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

            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Layers className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase text-primary tracking-widest">System Linkage</span>
                    <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest">Team 31</Badge>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Connectivity Hub</h1>
                <p className="text-muted-foreground font-medium text-sm">Manage high-speed data bridges between the AI system and external grid systems.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* ServiceNow Integration */}
                <Card className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden group border-t-4 border-t-orange-500 shadow-md">
                    <CardHeader className="p-8 pb-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-12 w-12 rounded-lg bg-orange-500/5 flex items-center justify-center border border-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                                <Zap className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <Badge className={cn(
                                "border px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest",
                                getStatus("servicenow") === "Live_Sync" ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/10" : "bg-rose-500/5 text-rose-500 border-rose-500/10"
                            )}>
                                {getStatus("servicenow").replace('_', ' ')}
                            </Badge>
                        </div>
                        <CardTitle className="text-foreground font-bold text-xl tracking-tight uppercase">ServiceNow Bridge</CardTitle>
                        <CardDescription className="text-muted-foreground font-medium">Auto-sync incidents with enterprise ITOM.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Instance Endpoint</Label>
                                <Input
                                    value={snConfig.url}
                                    onChange={(e) => setSnConfig({ ...snConfig, url: e.target.value })}
                                    className="bg-slate-50 dark:bg-slate-800 border-border rounded-lg h-10 text-xs text-foreground"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ServiceNow Pass</Label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={snConfig.password}
                                        onChange={(e) => setSnConfig({ ...snConfig, password: e.target.value })}
                                        className="bg-slate-50 dark:bg-slate-800 border-border rounded-lg h-10 text-xs text-foreground"
                                    />
                                </div>
                                <div className="space-y-2 text-right">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Latency</Label>
                                    <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">{getLatency("servicenow")}</p>
                                </div>
                            </div>
                        </div>

                        {testMessages["servicenow"] && (
                            <div className={cn(
                                "p-3 rounded-lg flex items-start gap-2 text-[10px] font-medium",
                                testingStates["servicenow"] === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                            )}>
                                {testingStates["servicenow"] === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                                <span>{testMessages["servicenow"]}</span>
                            </div>
                        )}

                        <Button
                            disabled={testingStates["servicenow"] === 'testing'}
                            onClick={() => handleTestConnection("servicenow", snConfig)}
                            className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-muted text-foreground border border-border rounded-lg h-12 font-bold transition-all uppercase tracking-widest text-[10px] group"
                        >
                            {testingStates["servicenow"] === 'testing' ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCcw className="mr-2 h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                            )}
                            {testingStates["servicenow"] === 'testing' ? "ESTABLISHING..." : "TEST LINKAGE"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Web Search Integration */}
                <Card className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden group border-t-4 border-t-blue-500 shadow-md">
                    <CardHeader className="p-8 pb-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-12 w-12 rounded-lg bg-blue-500/5 flex items-center justify-center border border-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                                <Globe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <Badge className={cn(
                                "border px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest",
                                getStatus("tavily") === "Connected" ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/10" : "bg-rose-500/5 text-rose-500 border-rose-500/10"
                            )}>
                                {getStatus("tavily")}
                            </Badge>
                        </div>
                        <CardTitle className="text-foreground font-bold text-xl tracking-tight uppercase">Web Search Engine</CardTitle>
                        <CardDescription className="text-muted-foreground font-medium">Real-time research for grid infrastructure data.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Provider Module</Label>
                                <Input defaultValue="Tavily Search Pro" readOnly className="bg-slate-50 dark:bg-slate-800 border-border rounded-lg h-10 text-xs text-foreground" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tavily API Key</Label>
                                <Input
                                    type="password"
                                    placeholder="tvly-••••••••"
                                    value={tavilyConfig.api_key}
                                    onChange={(e) => setTavilyConfig({ ...tavilyConfig, api_key: e.target.value })}
                                    className="bg-slate-50 dark:bg-slate-800 border-border rounded-lg h-10 text-xs text-foreground"
                                />
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-border/30">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Latency</p>
                                    <p className="text-xs font-bold text-foreground">{getLatency("tavily")}</p>
                                </div>
                                <ShieldCheck className={cn("h-5 w-5", getStatus("tavily") === "Connected" ? "text-emerald-500" : "text-rose-500")} />
                            </div>
                        </div>

                        {testMessages["tavily"] && (
                            <div className={cn(
                                "p-3 rounded-lg flex items-start gap-2 text-[10px] font-medium",
                                testingStates["tavily"] === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                            )}>
                                {testingStates["tavily"] === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                                <span>{testMessages["tavily"]}</span>
                            </div>
                        )}

                        <Button
                            disabled={testingStates["tavily"] === 'testing'}
                            onClick={() => handleTestConnection("tavily", tavilyConfig)}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-12 font-bold shadow-sm uppercase tracking-widest text-[10px]"
                        >
                            {testingStates["tavily"] === 'testing' ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {testingStates["tavily"] === 'testing' ? "VERIFYING..." : "TEST CONNECTION"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Knowledge Base Integration */}
                <Card className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden group border-t-4 border-t-purple-500 md:col-span-2 lg:col-span-1 shadow-md">
                    <CardHeader className="p-8 pb-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-12 w-12 rounded-lg bg-purple-500/5 flex items-center justify-center border border-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                                <Database className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <Badge className={cn(
                                "border px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest",
                                getStatus("database") === "Connected" ? "bg-primary/5 text-primary border-primary/10" : "bg-rose-500/5 text-rose-500 border-rose-500/10"
                            )}>
                                {getStatus("database") === "Connected" ? "RAG Enabled" : "DB Offline"}
                            </Badge>
                        </div>
                        <CardTitle className="text-foreground font-bold text-xl tracking-tight uppercase">Knowledge Nexus</CardTitle>
                        <CardDescription className="text-muted-foreground font-medium">Vector-indexed library of SOPs and manuals.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-4 space-y-4">
                        <Link href="/admin/documents">
                            <Button className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-lg h-12 font-bold transition-all uppercase tracking-widest text-[10px] group">
                                <Database className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                                Manage Knowledge Base
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <Card className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden shadow-md">
                    <CardHeader className="p-8 border-b border-border/50">
                        <CardTitle className="text-foreground font-bold uppercase tracking-tight">Indexing Engine</CardTitle>
                        <CardDescription className="text-muted-foreground font-medium font-mono text-[10px]">SYSTEM TASK RUNNER: INDEX DATA STREAM</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        {[
                            { name: 'Grid Maintenance SOP 2024.pdf', status: 'Indexed', size: '2.4 MB' },
                            { name: 'Emergency Protocol v4.docx', status: 'Processing', size: '1.1 MB' },
                            { name: 'Substation Schematics Zone4.pdf', status: 'Indexed', size: '15.8 MB' },
                        ].map((file, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-border/30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-foreground tracking-tight">{file.name}</span>
                                        <span className="text-[10px] text-slate-500 font-mono tracking-tighter">{file.size}</span>
                                    </div>
                                </div>
                                <Badge variant="outline" className={cn(
                                    "rounded font-bold text-[9px] uppercase tracking-widest px-2 py-0.5",
                                    file.status === 'Indexed' ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-primary/5 text-primary border-primary/20 animate-pulse"
                                )}>
                                    {file.status}
                                </Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-900 border border-border rounded-lg overflow-hidden relative shadow-md">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                    <CardHeader className="p-8 border-b border-border/50 relative z-10">
                        <CardTitle className="text-foreground font-bold uppercase tracking-tight">Bridge Telemetry</CardTitle>
                        <CardDescription className="text-muted-foreground font-medium font-mono text-[10px]">XFER SPEED BYTES PER SEC</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 relative z-10">
                        <div className="flex flex-col items-center justify-center h-48 gap-4">
                            <Activity className="h-16 w-16 text-[#1BB1E6] animate-pulse opacity-50 dark:opacity-40" />
                            <div className="text-center">
                                <p className="text-4xl font-bold text-foreground tracking-tight">842.4 <span className="text-xl text-muted-foreground italic">Mbps</span></p>
                                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-2">Nominal Throughput</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
