"use client"

import { useState, useEffect } from "react"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
    Brain,
    Settings as SettingsIcon,
    Shield,
    Save,
    RotateCcw,
    Lock,
    AlertCircle,
    Eye,
    EyeOff,
    Link,
    Loader2,
    CheckCircle2,
    XCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ChatWidget } from "@/components/chatbot/ChatWidget"
import { API_BASE_URL } from "@/lib/config"

export default function SettingsPage() {
    const [settings, setSettings] = useState<{ key: string; value: string }[]>([])
    const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
    const [isTesting, setIsTesting] = useState(false)
    const [testResult, setTestResult] = useState<{ status: 'success' | 'error', message: string } | null>(null)

    const fetchSettings = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/settings`)
            if (response.ok) {
                const data = await response.json()
                setSettings(data)
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error)
        }
    }

    useEffect(() => {
        fetchSettings()
    }, [])

    const getSetting = (key: string) => settings.find(s => s.key === key)?.value || ""

    const updateLocalSetting = (key: string, value: string) => {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s))
    }

    const handleSave = async () => {
        try {
            for (const s of settings) {
                await fetch(`${API_BASE_URL}/settings/${s.key}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value: s.value })
                })
            }
            toast.success("Kernel configuration synchronized.")
        } catch {
            toast.error("Security vault update failed. Integrity compromised.")
        }
    }

    const testConnection = async (testProvider: string) => {
        const apiKeyField = testProvider === "openai" ? "openai_api_key" : "google_api_key"
        const apiKey = getSetting(apiKeyField)

        if (!apiKey) {
            toast.error(`${testProvider.toUpperCase()} API Key is required for connection test.`)
            return
        }

        setIsTesting(true)
        setTestResult(null)
        try {
            const res = await fetch(`${API_BASE_URL}/settings/test-connection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: testProvider, api_key: apiKey })
            })
            const data = await res.json()
            setTestResult(data)
            if (data.status === 'success') {
                toast.success(data.message)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            setTestResult({ status: 'error', message: `Failed to reach ${testProvider} bridge.` })
            toast.error("Connection test failed.")
        } finally {
            setIsTesting(false)
        }
    }

    const providerModels: Record<string, { label: string, value: string }[]> = {
        openai: [
            { label: "GPT-4o", value: "gpt-4o" },
            { label: "GPT-4o-mini", value: "gpt-4o-mini" },
            { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
            { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
        ],
        google: [
            { label: "Gemini 3 Flash Preview", value: "gemini-3-flash-preview" },
            { label: "Gemini 1.5 Pro", value: "gemini-1.5-pro" },
            { label: "Gemini 1.5 Flash", value: "gemini-1.5-flash" },
            { label: "Gemini Pro", value: "gemini-pro" },
        ]
    }

    const currentProvider = getSetting("llm_provider") || "openai"

    const setActiveProvider = (provider: string) => {
        updateLocalSetting("llm_provider", provider)
        const relevantModelKey = provider === "openai" ? "openai_model" : "google_model"
        const relevantModel = getSetting(relevantModelKey)
        updateLocalSetting("model_name", relevantModel)
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
                    <SettingsIcon className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase text-primary tracking-widest">System Kernel</span>
                    <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest">Team 31</Badge>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Kernel Configuration</h1>
                <p className="text-muted-foreground font-medium text-sm">Tune global hyper-parameters and system security protocols.</p>
            </div>

            <Tabs defaultValue="llm" className="space-y-8">
                <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg h-14 w-full md:w-auto overflow-x-auto no-scrollbar">
                    <TabsTrigger value="llm" className="rounded-lg px-8 h-12 font-bold uppercase tracking-widest text-[10px] data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                        <Brain className="mr-2 h-4 w-4" /> LLM ENGINE
                    </TabsTrigger>
                    <TabsTrigger value="security" className="rounded-lg px-8 h-12 font-bold uppercase tracking-widest text-[10px] data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                        <Shield className="mr-2 h-4 w-4" /> SECURITY GUARDRAILS
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="llm" className="animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Unified Neural Engine Card */}
                        <Card className="bg-white dark:bg-slate-900 border border-border rounded-lg shadow-md overflow-hidden">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-foreground font-bold uppercase tracking-tight text-xl">Primary Neural Engine</CardTitle>
                                <CardDescription className="text-muted-foreground font-medium">Unified configuration for your chosen LLM provider.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 pt-4 space-y-8">
                                {/* STEP 1: Provider */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-bold border-primary/30 text-primary">STEP 1</Badge>
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Neural Provider</Label>
                                    </div>
                                    <Select
                                        value={getSetting("llm_provider")}
                                        onValueChange={(val) => {
                                            updateLocalSetting("llm_provider", val)
                                            // Sync model_name to the provider's specific model
                                            const providerModelKey = val === "openai" ? "openai_model" : "google_model"
                                            const savedModel = getSetting(providerModelKey)
                                            if (savedModel) {
                                                updateLocalSetting("model_name", savedModel)
                                            } else {
                                                const defaultModel = providerModels[val]?.[0]?.value || ""
                                                updateLocalSetting("model_name", defaultModel)
                                                updateLocalSetting(providerModelKey, defaultModel)
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-border rounded-lg h-12 text-sm font-bold text-foreground transition-all hover:border-primary/50">
                                            <SelectValue placeholder="Begin by choosing a provider..." />
                                        </SelectTrigger>
                                        <SelectContent className="border-border shadow-xl">
                                            <SelectItem value="openai">OpenAI (Primary)</SelectItem>
                                            <SelectItem value="google">Google Gemini (Dynamic)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* STEP 2 & 3 appearing after provider selection or being visible by default if one exists */}
                                <div className="space-y-8 pt-6 border-t border-border/50 animate-in slide-in-from-top-4 duration-500">
                                    {/* STEP 2: DYNAMIC MODELS */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-bold border-primary/30 text-primary">STEP 2</Badge>
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Model Hierarchy</Label>
                                        </div>
                                        <Select
                                            value={getSetting("model_name")}
                                            onValueChange={(val) => {
                                                updateLocalSetting("model_name", val)
                                                const providerModelKey = getSetting("llm_provider") === "openai" ? "openai_model" : "google_model"
                                                updateLocalSetting(providerModelKey, val)
                                            }}
                                        >
                                            <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-border rounded-lg h-12 text-sm font-bold text-foreground hover:border-primary/50">
                                                <SelectValue placeholder="Select computation model" />
                                            </SelectTrigger>
                                            <SelectContent className="border-border shadow-xl">
                                                {(providerModels[getSetting("llm_provider")] || providerModels.openai).map(m => (
                                                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* STEP 3: API KEY CHECK */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-bold border-primary/30 text-primary">STEP 3</Badge>
                                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                {getSetting("llm_provider") === "google" ? "Google API Key" : "OpenAI Access Token"}
                                            </Label>
                                        </div>
                                        <div className="relative group">
                                            <Input
                                                type={showApiKey[getSetting("llm_provider") || "openai"] ? "text" : "password"}
                                                value={getSetting(getSetting("llm_provider") === "google" ? "google_api_key" : "openai_api_key")}
                                                onChange={(e) => updateLocalSetting(getSetting("llm_provider") === "google" ? "google_api_key" : "openai_api_key", e.target.value)}
                                                placeholder={`Enter key for ${getSetting("llm_provider") || "OpenAI"}...`}
                                                className="bg-slate-50 dark:bg-slate-800 border-border rounded-lg h-12 text-sm font-bold text-foreground pr-28 transition-all focus:ring-1 focus:ring-primary/20"
                                            />
                                            <div className="absolute right-2 top-2 flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                                    onClick={() => {
                                                        const p = getSetting("llm_provider") || "openai"
                                                        setShowApiKey(prev => ({ ...prev, [p]: !prev[p] }))
                                                    }}
                                                >
                                                    {showApiKey[getSetting("llm_provider") || "openai"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                                <Button
                                                    onClick={() => testConnection(getSetting("llm_provider") || "openai")}
                                                    disabled={isTesting}
                                                    variant="secondary"
                                                    size="sm"
                                                    className="h-8 px-3 text-[10px] font-bold uppercase tracking-tight bg-primary/10 text-primary hover:bg-primary/20 border-none shadow-none"
                                                >
                                                    {isTesting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Link className="h-3 w-3 mr-1" />}
                                                    Check
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {testResult && (
                                        <div className={cn("p-4 rounded-lg flex items-center gap-3 text-xs font-bold border animate-in slide-in-from-top-2",
                                            testResult.status === 'success' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20")}>
                                            {testResult.status === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                                            {testResult.message}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Inference Control Card - Side by side on desktop */}
                        <Card className="bg-white dark:bg-slate-900 border border-border rounded-lg shadow-md">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-foreground font-bold uppercase tracking-tight text-xl">Inference Control</CardTitle>
                                <CardDescription className="text-muted-foreground font-medium">Fine-tune token generation and response behavior for the chosen engine.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 pt-4 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Temperature</Label>
                                        <Input
                                            type="number"
                                            value={getSetting("temperature")}
                                            onChange={(e) => updateLocalSetting("temperature", e.target.value)}
                                            step="0.1" max="1" min="0"
                                            className="bg-slate-50 dark:bg-slate-800 border-border rounded-lg h-11 text-xs font-bold text-foreground"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Max Tokens</Label>
                                        <Input
                                            type="number"
                                            value={getSetting("max_tokens")}
                                            onChange={(e) => updateLocalSetting("max_tokens", e.target.value)}
                                            className="bg-slate-50 dark:bg-slate-800 border-border rounded-lg h-11 text-xs font-bold text-foreground"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-border">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-foreground uppercase tracking-tight">Real-time Streaming</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">Enable token-by-token output delivery.</p>
                                    </div>
                                    <Switch
                                        checked={getSetting("realtime_streaming") === "true"}
                                        onCheckedChange={(checked) => updateLocalSetting("realtime_streaming", checked.toString())}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="security" className="animate-in fade-in slide-in-from-top-2 duration-500">
                    <Card className="bg-white dark:bg-slate-900 border border-border rounded-lg shadow-md overflow-hidden">
                        <div className="p-8 border-b border-border/50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-lg bg-rose-500/5 flex items-center justify-center border border-rose-500/10">
                                    <Shield className="h-6 w-6 text-rose-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-foreground font-bold uppercase tracking-tight text-xl">Governance Protocols</CardTitle>
                                    <CardDescription className="text-muted-foreground font-medium">Strict neural guardrails and human-in-the-loop overrides.</CardDescription>
                                </div>
                            </div>
                            <Badge variant="outline" className="border-rose-500/30 text-rose-500 font-bold uppercase tracking-widest px-4 py-2 rounded-lg text-xs">High Alert Mode</Badge>
                        </div>
                        <CardContent className="p-8 space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-border">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-bold text-foreground uppercase">Neural Input Scan</Label>
                                            <p className="text-[10px] text-muted-foreground font-medium">Auto-detect prompt injections and malicious intent.</p>
                                        </div>
                                        <Switch
                                            checked={getSetting("guardrails_input_scan") === "true"}
                                            onCheckedChange={(checked) => updateLocalSetting("guardrails_input_scan", checked.toString())}
                                            className="data-[state=checked]:bg-primary"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-border">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-bold text-foreground uppercase">Output Validation Judge</Label>
                                            <p className="text-[10px] text-muted-foreground font-medium">Multi-step evaluation for response accuracy.</p>
                                        </div>
                                        <Switch
                                            checked={getSetting("guardrails_output_validation") === "true"}
                                            onCheckedChange={(checked) => updateLocalSetting("guardrails_output_validation", checked.toString())}
                                            className="data-[state=checked]:bg-primary"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-border">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-bold text-foreground uppercase">PII Redaction Engine</Label>
                                            <p className="text-[10px] text-muted-foreground font-medium">Automatically mask sensitive user information.</p>
                                        </div>
                                        <Switch
                                            checked={getSetting("guardrails_pii_masking") === "true"}
                                            onCheckedChange={(checked) => updateLocalSetting("guardrails_pii_masking", checked.toString())}
                                            className="data-[state=checked]:bg-primary"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-border">
                                        <div className="space-y-1">
                                            <Label className="text-xs font-bold text-foreground uppercase">Competitor Filter</Label>
                                            <p className="text-[10px] text-muted-foreground font-medium">Block references to rival energy providers.</p>
                                        </div>
                                        <Switch
                                            checked={getSetting("guardrails_competitor_filter") === "true"}
                                            onCheckedChange={(checked) => updateLocalSetting("guardrails_competitor_filter", checked.toString())}
                                            className="data-[state=checked]:bg-primary"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="p-6 rounded-lg bg-rose-500/5 border border-rose-500/20 flex items-center gap-4">
                                        <AlertCircle className="h-8 w-8 text-rose-500 shrink-0" />
                                        <p className="text-xs font-medium text-rose-600 dark:text-rose-400">Governance policies require human approval for all integration writes to the Production grid.</p>
                                    </div>
                                    <div className="p-6 rounded-lg bg-slate-50 dark:bg-slate-800 border border-border">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-foreground mb-3 flex items-center gap-2">
                                            <Lock className="h-3 w-3" /> System Integrity
                                        </h4>
                                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                                            All neural operations are logged with cryptographic signatures. Guardrails are processed on dedicated
                                            Neural Guard nodes to ensure zero-latency security interference.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs >

            <div className="pt-8 border-t border-border/50 flex justify-end gap-3">
                <Button variant="outline" className="h-12 px-8 rounded-lg border-border bg-background text-foreground font-bold uppercase tracking-widest text-xs hover:bg-slate-50 transition-all">
                    <RotateCcw className="mr-2 h-4 w-4" /> REVERT GENESIS
                </Button>
                <Button
                    onClick={handleSave}
                    className="h-12 px-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest text-xs shadow-sm shadow-primary/20 transition-all"
                >
                    <Save className="mr-2 h-4 w-4" /> COMMIT CHANGES
                </Button>
            </div>
        </div >
    )
}
