import React from "react"
import { Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Message } from "@/hooks/useChat"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MessageBubbleProps {
    msg: Message
    primaryColor: string
    variant: "embedded" | "widget"
    onActionClick?: (label: string) => void
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ msg, primaryColor, variant, onActionClick }) => {
    return (
        <div className={cn(
            "flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
            msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
        )}>
            {msg.sender === "bot" && (
                <div className={cn(
                    "h-10 w-10 rounded-lg border flex items-center justify-center shrink-0 shadow-sm mt-1 transition-all duration-300",
                    variant === "embedded" ? "bg-muted border-border" : "bg-card dark:bg-slate-800 border-border"
                )}>
                    <Bot className="h-5 w-5" style={{ color: variant === "embedded" ? "var(--primary)" : primaryColor }} />
                </div>
            )}
            <div className="space-y-3 flex-1">
                <div className={cn(
                    "p-5 rounded-lg text-sm leading-relaxed relative transition-all duration-300 shadow-xl",
                    msg.sender === "user"
                        ? variant === "embedded"
                            ? "bg-primary text-white rounded-tr-none border border-primary/20 shadow-lg"
                            : "bg-primary text-white rounded-tr-none shadow-md"
                        : variant === "embedded"
                            ? "bg-card backdrop-blur-md text-foreground border border-border rounded-tl-none"
                            : "bg-card text-foreground rounded-tl-none border border-border"
                )}>
                    {msg.sender === "bot" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
                                    ul: ({ children }: any) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                                    ol: ({ children }: any) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                                    li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
                                    strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
                                    em: ({ children }: any) => <em className="italic">{children}</em>,
                                    code: ({ children }: any) => <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs">{children}</code>,
                                }}
                            >
                                {msg.text}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        msg.text
                    )}
                    <div className={cn("text-[9px] mt-2 font-bold mb-[-4px] opacity-40 uppercase tracking-widest", msg.sender === "user" ? "text-right" : "text-left")}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
                {msg.actions && (
                    <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-left-2 duration-500 delay-200">
                        {msg.actions.map((action, i) => (
                            <Button
                                key={i}
                                variant={action.variant || "secondary"}
                                size="sm"
                                className="h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-tight"
                                onClick={() => onActionClick?.(action.label)}
                            >
                                <action.icon className="mr-1.5 h-3 w-3" /> {action.label}
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

interface ChatMessagesProps {
    messages: Message[]
    isThinking: boolean
    primaryColor: string
    variant: "embedded" | "widget"
    onActionClick?: (label: string) => void
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isThinking, primaryColor, variant, onActionClick }) => {
    return (
        <>
            {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} primaryColor={primaryColor} variant={variant} onActionClick={onActionClick} />
            ))}
            {isThinking && (
                <div className="flex gap-3 mr-auto max-w-[85%] animate-pulse">
                    <div className={cn(
                        "h-10 w-10 rounded-lg border flex items-center justify-center shrink-0",
                        variant === "embedded" ? "bg-card border-border" : "bg-white dark:bg-slate-800 border-border"
                    )}>
                        <Bot className="h-5 w-5" style={{ color: variant === "embedded" ? "var(--primary)" : primaryColor }} />
                    </div>
                    <div className={cn(
                        "p-5 rounded-lg rounded-tl-none flex items-center gap-1.5 shadow-sm border",
                        variant === "embedded" ? "bg-card border-border" : "bg-slate-50 dark:bg-slate-800 border-border"
                    )}>
                        {[0, 150, 300].map(delay => (
                            <div key={delay} className="h-1.5 w-1.5 rounded-lg bg-primary animate-bounce" style={{ animationDelay: `${-delay}ms` }} />
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}
