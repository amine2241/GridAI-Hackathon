"use client"

import { useEffect, useState } from "react"
import {
    Bell,
    Search,
    LayoutGrid,
    Activity,
    Bot,
    Workflow,
    FileText,
    Settings,
    User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "./ThemeToggle"

export function Topbar() {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    return (
        <header className="h-20 flex items-center px-4 lg:px-8 z-40 relative">
            <div className="flex-1 flex items-center gap-8 glass dark:glass-dark px-6 h-14 rounded-lg border border-border shadow-sm">
                <div className="flex items-center gap-6 border-r border-border pr-6">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-lg bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Grid</span>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[7px] font-black uppercase tracking-widest px-1 py-0 h-3">Team 31</Badge>
                    </div>
                </div>

                <div className="flex-1" />

                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                        <Bell className="h-5 w-5" />
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        className="h-10 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-border flex items-center gap-2 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        onClick={() => setOpen(true)}
                    >
                        <Search className="h-4 w-4 text-primary" />
                        <span className="text-[11px] font-bold uppercase tracking-tight hidden md:inline-block">Search Nodes...</span>
                        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-white dark:bg-slate-900 px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </Button>

                    <CommandDialog open={open} onOpenChange={setOpen}>
                        <CommandInput placeholder="Type a command or search..." />
                        <CommandList className="no-scrollbar">
                            <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup heading="Suggestions">
                                <CommandItem className="cursor-pointer">
                                    <Bot className="mr-2 h-4 w-4 text-purple-500" />
                                    <span>Triage Sentinel</span>
                                    <CommandShortcut className="font-bold text-[9px] uppercase tracking-widest text-slate-400">Agent</CommandShortcut>
                                </CommandItem>
                                <CommandItem className="cursor-pointer">
                                    <Workflow className="mr-2 h-4 w-4 text-emerald-500" />
                                    <span>ServiceNow Sync</span>
                                    <CommandShortcut className="font-bold text-[9px] uppercase tracking-widest text-slate-400">Workflow</CommandShortcut>
                                </CommandItem>
                                <CommandItem className="cursor-pointer">
                                    <FileText className="mr-2 h-4 w-4 text-orange-500" />
                                    <span>System Overheat Log</span>
                                    <CommandShortcut className="font-bold text-[9px] uppercase tracking-widest text-slate-400">Log</CommandShortcut>
                                </CommandItem>
                            </CommandGroup>
                            <CommandSeparator />
                            <CommandGroup heading="Quick Actions">
                                <CommandItem className="cursor-pointer">
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                    <CommandShortcut>⌘P</CommandShortcut>
                                </CommandItem>
                                <CommandItem className="cursor-pointer">
                                    <Activity className="mr-2 h-4 w-4" />
                                    <span>System Health</span>
                                    <CommandShortcut>⌘H</CommandShortcut>
                                </CommandItem>
                                <CommandItem className="cursor-pointer">
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>Settings</span>
                                    <CommandShortcut>⌘S</CommandShortcut>
                                </CommandItem>
                            </CommandGroup>
                        </CommandList>
                    </CommandDialog>
                </div>
            </div>
        </header>
    )
}

