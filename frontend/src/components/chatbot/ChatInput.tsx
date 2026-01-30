import React from "react"
import { Upload, Send, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ChatInputProps {
    value: string
    onChange: (v: string) => void
    onSend: () => void
    primaryColor: string
    variant: "embedded" | "widget"
}

export const ChatInput: React.FC<ChatInputProps> = ({ value, onChange, onSend, primaryColor, variant }) => {
    return (
        <>
            <div className="relative group flex gap-3 max-w-4xl mx-auto w-full">
                <div className="relative flex-1">
                    <Input
                        placeholder={variant === "embedded" ? "Initialize neural command..." : "Neural prompt..."}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && onSend()}
                        className={cn(
                            "px-6 pr-14 h-14 rounded-lg text-sm font-medium transition-all duration-300 shadow-sm",
                            variant === "embedded"
                                ? "bg-muted/50 border-border text-foreground focus-visible:ring-primary focus-visible:bg-muted/80 placeholder:text-muted-foreground"
                                : "bg-card dark:bg-slate-800 border-border text-foreground"
                        )}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                            <Upload className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <button
                    className={cn(
                        "h-14 rounded-lg shadow-xl transition-all active:scale-95 shrink-0 flex items-center justify-center gap-2",
                        variant === "embedded" ? "bg-primary hover:bg-primary/90 text-white shadow-primary/20 px-6" : "px-4 min-w-[56px]"
                    )}
                    style={variant === "widget" ? { backgroundColor: primaryColor, color: 'white' } : {}}
                    onClick={onSend}
                >
                    <Send className="h-5 w-5" />
                    <span className={cn("font-bold uppercase tracking-widest text-[10px]", variant === "widget" && "hidden sm:inline")}>Send</span>
                </button>
            </div>
            <div className={cn("flex items-center mt-4 px-2 max-w-4xl mx-auto w-full", variant === "embedded" ? "justify-between" : "justify-center gap-1.5 opacity-30 grayscale hover:opacity-100 transition-opacity cursor-default")}>
                {variant === "embedded" ? (
                    <>

                    </>
                ) : (
                    <>
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                        <span className="text-[9px] font-bold uppercase tracking-tight">System Secure / PII Masking Active</span>
                    </>
                )}
            </div>
        </>
    )
}
