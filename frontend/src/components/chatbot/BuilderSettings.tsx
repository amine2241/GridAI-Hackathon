import React from "react"
import { Cpu, Palette, Zap, Volume2, Video as VideoIcon, Database, Layers } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface BuilderSettingsProps {
    workflows: any[]
    selectedWorkflowId: string
    onWorkflowChange: (id: string) => void
    agentName: string
    onAgentNameChange: (val: string) => void
    primaryColor: string
    onPrimaryColorChange: (val: string) => void
    welcomeMessage: string
    onWelcomeMessageChange: (val: string) => void
    capabilities: any
    onCapabilitiesChange: (caps: any) => void
}

export const BuilderSettings: React.FC<BuilderSettingsProps> = ({
    workflows,
    selectedWorkflowId,
    onWorkflowChange,
    agentName,
    onAgentNameChange,
    primaryColor,
    onPrimaryColorChange,
    welcomeMessage,
    onWelcomeMessageChange,
    capabilities,
    onCapabilitiesChange
}) => {
    return (
        <div className="space-y-8">
            {/* Neural Node Selector */}
            <div className="bg-card border border-border rounded-lg p-8 shadow-sm space-y-8">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                    <Cpu className="h-5 w-5 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Neural Node Calibration</h3>
                </div>

                <div className="space-y-6">
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-1 mb-4">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Testing Protocol</p>
                        <p className="text-[9px] text-muted-foreground font-medium">Select a cognitive node to simulate specific agent behaviors.</p>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 leading-none italic opacity-60">Active Neural Persona</Label>
                        <Select value={selectedWorkflowId} onValueChange={onWorkflowChange}>
                            <SelectTrigger className="h-12 bg-muted/30 border-border rounded-lg font-bold text-sm">
                                <SelectValue placeholder="Select Neural Node" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border shadow-xl">
                                <SelectItem value="default" className="font-bold text-xs uppercase tracking-widest py-3">Default System Logic</SelectItem>
                                {workflows.map(wf => (
                                    <SelectItem key={wf.id} value={wf.id} className="font-bold text-xs uppercase tracking-widest italic py-3">
                                        {wf.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Identity & Visuals */}
            <div className="bg-card border border-border rounded-lg p-8 shadow-sm space-y-8">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                    <Palette className="h-5 w-5 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Visual Core</h3>
                </div>

                <div className="space-y-6">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 leading-none italic opacity-60">Agent Identity</Label>
                        <Input
                            value={agentName}
                            onChange={(e) => onAgentNameChange(e.target.value)}
                            className="h-12 bg-muted/30 border-border focus:ring-primary rounded-lg text-sm font-bold"
                            placeholder="Enter agent name..."
                        />
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 leading-none italic opacity-60">Brand Neural Token</Label>
                        <div className="flex gap-4">
                            <Input
                                type="color"
                                value={primaryColor}
                                onChange={(e) => onPrimaryColorChange(e.target.value)}
                                className="h-12 w-20 bg-muted/30 border-border rounded-lg cursor-pointer p-1"
                            />
                            <Input
                                value={primaryColor}
                                onChange={(e) => onPrimaryColorChange(e.target.value)}
                                className="h-12 flex-1 bg-muted/30 border-border rounded-lg text-sm font-mono font-bold"
                                placeholder="#0070AD"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 leading-none italic opacity-60">Neural Greeting</Label>
                        <Textarea
                            value={welcomeMessage}
                            onChange={(e) => onWelcomeMessageChange(e.target.value)}
                            className="min-h-[100px] bg-muted/30 border-border rounded-lg text-sm font-medium"
                            placeholder="Enter welcome message..."
                        />
                    </div>
                </div>
            </div>

            {/* Logic & Capabilities */}
            <div className="bg-card border border-border rounded-lg p-8 shadow-sm space-y-8">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                    <Zap className="h-5 w-5 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Neural Capabilities</h3>
                </div>

                <div className="space-y-5">
                    {[
                        { id: 'voice', icon: Volume2, label: 'Voice Synthesis Link', desc: 'Enable full two-way neural audio' },
                        { id: 'video', icon: VideoIcon, label: 'Holographic Avatar', desc: 'Sync real-time video projection' },
                        { id: 'knowledge', icon: Database, label: 'Knowledge Base Sync', desc: 'Auto-ingest proprietary telemetry' },
                        { id: 'automation', icon: Layers, label: 'Action Executors', desc: 'Allow bot to run system actions' },
                    ].map((cap) => (
                        <div key={cap.id} className="flex items-center justify-between group">
                            <div className="flex gap-3">
                                <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center border border-primary/10 group-hover:bg-primary/10 transition-colors shadow-sm">
                                    <cap.icon className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-foreground uppercase tracking-tighter leading-none mb-1">{cap.label}</span>
                                    <span className="text-[9px] text-muted-foreground font-medium opacity-70">{cap.desc}</span>
                                </div>
                            </div>
                            <Switch
                                checked={capabilities[cap.id as keyof typeof capabilities]}
                                onCheckedChange={(val) => {
                                    onCapabilitiesChange({ ...capabilities, [cap.id]: val })
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
