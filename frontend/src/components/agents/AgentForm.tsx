"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
    Cpu,
    Zap,
    Shield,
    Database,
    Terminal,
    Rocket,
    Activity,
    Brain,
    Bot,
    Wrench,
    Lock,
    Globe,
    Code2
} from "lucide-react"
import { cn } from "@/lib/utils"

const agentSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    type: z.enum(["Triage", "ServiceNow", "Knowledge", "Web Search", "Analysis"]),
    description: z.string().min(10, "Description must be at least 10 characters"),
    systemPrompt: z.string().min(20, "System prompt must be descriptive"),
    tools: z.array(z.string()).min(1, "Select at least one tool"),
    executionMode: z.enum(["Automatic", "Human Approval"]),
    inputSchema: z.string(),
    outputSchema: z.string(),
})

type AgentFormValues = z.infer<typeof agentSchema>

interface AgentFormProps {
    initialData?: Partial<AgentFormValues>
    onSubmit: (values: AgentFormValues) => void
    onCancel: () => void
}

const CAPABILITIES = [
    { id: "Knowledge Base", name: "RAG Engine", desc: "Access to vector-indexed documents and SOPs.", icon: Database, color: "text-purple-500", bg: "bg-purple-500/10" },
    { id: "ServiceNow API", name: "ITOM Bridge", desc: "Integration with ServiceNow for ticket mutation.", icon: Zap, color: "text-orange-500", bg: "bg-orange-500/10" },
    { id: "Web Search", name: "Neural Search", desc: "Real-time external web research capabilities.", icon: Globe, color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: "Grid Data Relay", name: "SCADA Core", desc: "Direct telemetry access to grid infrastructure.", icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" },
]

export function AgentForm({ initialData, onSubmit, onCancel }: AgentFormProps) {
    const form = useForm<AgentFormValues>({
        resolver: zodResolver(agentSchema),
        defaultValues: {
            name: initialData?.name || "",
            type: initialData?.type || "Triage",
            description: initialData?.description || "",
            systemPrompt: initialData?.systemPrompt || "",
            tools: initialData?.tools || ["Knowledge Base"],
            executionMode: initialData?.executionMode || "Automatic",
            inputSchema: initialData?.inputSchema || "{}",
            outputSchema: initialData?.outputSchema || "{}",
        },
    })

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
                {/* Header Section */}
                <div className="relative p-6 rounded-lg bg-primary/5 border border-primary/10 overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                        <Bot className="h-16 w-16 text-primary" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-[10px] font-bold uppercase text-primary tracking-widest">Neural.Matrix // Initialization</span>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight uppercase text-foreground">Configure Alpha-Node</h2>
                        <p className="text-sm text-muted-foreground font-medium mt-1">Define the fundamental directives and capability parameters for this autonomous entity.</p>
                    </div>
                </div>

                <div className="space-y-10 px-2">
                    {/* Identity & Core Section */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-border pb-4">
                            <Cpu className="h-5 w-5 text-primary" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">01. Core_Identity</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Node_Identifier</FormLabel>
                                        <FormControl>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-border pr-3 mr-3 text-muted-foreground group-focus-within:text-primary transition-colors">
                                                    <Terminal className="h-4 w-4" />
                                                </div>
                                                <Input placeholder="AI_SENTINEL_ALPHA" {...field} className="pl-16 h-12 bg-transparent border-border focus:border-primary rounded-lg text-sm font-bold focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" />
                                            </div>
                                        </FormControl>
                                        <FormMessage className="text-[10px] uppercase font-bold" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Specialization_Class</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-12 bg-transparent border-border focus:border-primary rounded-lg text-sm font-bold text-foreground focus:ring-0 transition-all">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="bg-background border-border rounded-lg p-2 shadow-xl">
                                                {[
                                                    { v: "Triage", l: "Triage Node", desc: "Initial incident classification" },
                                                    { v: "ServiceNow", l: "Sync Node", desc: "Enterprise system mutation" },
                                                    { v: "Knowledge", l: "RAG Crawler", desc: "Advanced document research" },
                                                    { v: "Web Search", l: "External Search", desc: "Neural web analysis" },
                                                    { v: "Analysis", l: "Deep Reasoning", desc: "Complex root cause analysis" },
                                                ].map((t) => (
                                                    <SelectItem key={t.v} value={t.v} className="rounded-lg py-3 focus:bg-primary/5 transition-colors">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold uppercase tracking-tight text-xs">{t.l}</span>
                                                            <span className="text-[10px] text-muted-foreground font-medium">{t.desc}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage className="text-[10px] uppercase font-bold" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Functional_Abstract</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Define primary mission parameters and operational boundaries..." {...field} className="min-h-[100px] bg-transparent border-border focus:border-primary rounded-lg p-5 text-sm font-medium focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" />
                                    </FormControl>
                                    <FormMessage className="text-[10px] uppercase font-bold" />
                                </FormItem>
                            )}
                        />
                    </section>

                    {/* Reasoning Section */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-border pb-4">
                            <Brain className="h-5 w-5 text-primary" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">02. Reasoning_Matrix</h3>
                        </div>

                        <FormField
                            control={form.control}
                            name="systemPrompt"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Primary_Directive</FormLabel>
                                    <FormControl>
                                        <div className="relative group">
                                            <div className="absolute top-6 left-6 flex items-center gap-2 opacity-50 group-focus-within:opacity-100 transition-opacity">
                                                <Code2 className="h-4 w-4 text-primary" />
                                                <span className="text-[9px] font-mono font-bold uppercase tracking-widest bg-primary/10 text-primary px-2 py-0.5 rounded">SYSTEM_PROMPT</span>
                                            </div>
                                            <Textarea placeholder="Internal prompt logic for the neural model..." {...field} className="min-h-[200px] bg-slate-50 dark:bg-slate-900 border-border focus:border-primary rounded-lg p-10 pt-16 font-mono text-xs leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0 transition-all" />
                                        </div>
                                    </FormControl>
                                    <FormDescription className="text-[10px] text-muted-foreground italic mt-2 px-2">
                                        This prompt defines the AI&apos;s persona, operational rules, and logic execution flow.
                                    </FormDescription>
                                    <FormMessage className="text-[10px] uppercase font-bold" />
                                </FormItem>
                            )}
                        />
                    </section>

                    {/* Capabilities Selection - NEW CAPABILITY GRID */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-border pb-4">
                            <Wrench className="h-5 w-5 text-primary" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">03. Neural_Capabilities</h3>
                        </div>

                        <FormField
                            control={form.control}
                            name="tools"
                            render={() => (
                                <FormItem className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {CAPABILITIES.map((tool) => (
                                            <FormField
                                                key={tool.id}
                                                control={form.control}
                                                name="tools"
                                                render={({ field }) => {
                                                    const isChecked = field.value?.includes(tool.id)
                                                    return (
                                                        <FormItem
                                                            onClick={() => {
                                                                const newValue = isChecked
                                                                    ? field.value?.filter((v) => v !== tool.id)
                                                                    : [...field.value, tool.id]
                                                                field.onChange(newValue)
                                                            }}
                                                            className={cn(
                                                                "relative flex flex-row items-center space-x-0 space-y-0 p-5 rounded-lg border transition-all cursor-pointer select-none group h-auto",
                                                                isChecked
                                                                    ? "bg-primary/5 border-primary/30 shadow-sm"
                                                                    : "bg-transparent border-border hover:border-primary/20 hover:bg-primary/[0.01]"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "h-12 w-12 rounded-lg flex items-center justify-center mr-4 shrink-0 transition-transform group-hover:scale-105",
                                                                tool.bg, tool.color
                                                            )}>
                                                                <tool.icon className="h-6 w-6" />
                                                            </div>
                                                            <div className="flex-1 space-y-0.5">
                                                                <FormLabel className="text-xs font-bold text-foreground uppercase tracking-widest block cursor-pointer">
                                                                    {tool.name}
                                                                </FormLabel>
                                                                <p className="text-[10px] text-muted-foreground font-medium pr-8">{tool.desc}</p>
                                                            </div>
                                                            <div className="absolute right-5 flex items-center justify-center">
                                                                <Checkbox
                                                                    checked={isChecked}
                                                                    className="border-primary/20 data-[state=checked]:bg-primary rounded-md h-5 w-5"
                                                                />
                                                            </div>
                                                        </FormItem>
                                                    )
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <FormMessage className="text-[10px] uppercase font-bold" />
                                </FormItem>
                            )}
                        />
                    </section>

                    {/* Operational Protocols */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                            <Lock className="h-5 w-5 text-primary" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">04. Operational_Protocols</h3>
                        </div>

                        <FormField
                            control={form.control}
                            name="executionMode"
                            render={({ field }) => (
                                <FormItem className="space-y-4">
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                        >
                                            {[
                                                { v: "Automatic", l: "Full Autonomy", desc: "Autonomous execution within guardrails.", icon: Zap },
                                                { v: "Human Approval", l: "Human-in-the-Loop", desc: "Explicit verification for every mutation.", icon: Shield },
                                            ].map((m) => (
                                                <FormItem key={m.v} className={cn(
                                                    "flex items-center space-x-0 space-y-0 p-5 rounded-lg border transition-all cursor-pointer group",
                                                    field.value === m.v ? "bg-primary/5 border-primary/30" : "bg-slate-50 dark:bg-slate-900 border-border hover:bg-slate-100 dark:hover:bg-slate-800"
                                                )}>
                                                    <FormControl className="mr-4">
                                                        <RadioGroupItem value={m.v} className="border-primary/30 text-primary h-5 w-5" />
                                                    </FormControl>
                                                    <div className="space-y-0.5 cursor-pointer">
                                                        <div className="flex items-center gap-2">
                                                            <m.icon className={cn("h-3 w-3", field.value === m.v ? "text-primary" : "text-muted-foreground")} />
                                                            <FormLabel className="text-[11px] font-bold text-foreground uppercase tracking-widest">{m.l}</FormLabel>
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground font-medium italic">{m.desc}</p>
                                                    </div>
                                                </FormItem>
                                            ))}
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage className="text-[10px] uppercase font-bold" />
                                </FormItem>
                            )}
                        />
                    </section>
                </div>

                {/* Footer Actions */}
                <div className="pt-10 border-t border-border/50 flex flex-col sm:flex-row gap-4">
                    <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-12 rounded-lg border-border bg-background text-foreground font-bold uppercase tracking-widest hover:bg-muted transition-all text-[11px] shadow-sm">
                        ABORT_PROTOCOL
                    </Button>
                    <Button type="submit" className="flex-1 h-12 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest shadow-sm transition-all text-[11px]">
                        <Rocket className="mr-3 h-4 w-4" /> COMMIT_ALPHA_NODE
                    </Button>
                </div>
            </form>
        </Form>
    )
}
