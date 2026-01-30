"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    Bot,
    Workflow,
    Settings,
    FileText,
    AlertCircle,
    Layers,
    Cpu,
    MessageSquare,
    LogOut,
    Ticket,
    Database,
    Users
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"

interface NavigationItem {
    name: string;
    href: string;
    icon: React.ElementType;
    color: string;
    isDev?: boolean;
}

const adminNavigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, color: 'text-blue-400' },
    { name: 'Incidents', href: '/incidents', icon: AlertCircle, color: 'text-rose-600' },
    { name: 'RAG', href: '/admin/documents', icon: Database, color: 'text-cyan-500' },
    { name: 'User Manager', href: '/admin/users', icon: Users, color: 'text-pink-600' },
    { name: 'Chatbot Builder', href: '/admin/chatbot', icon: MessageSquare, color: 'text-amber-500', isDev: true },
    { name: 'Agents', href: '/agents', icon: Bot, color: 'text-purple-600', isDev: true },
    { name: 'Workflows', href: '/workflows', icon: Workflow, color: 'text-emerald-600', isDev: true },
    { name: 'Integrations', href: '/integrations', icon: Layers, color: 'text-orange-600', isDev: true },
    { name: 'Logs', href: '/logs', icon: FileText, color: 'text-slate-500', isDev: true },
    { name: 'Settings', href: '/settings', icon: Settings, color: 'text-indigo-600', isDev: true },
]

const userNavigation: NavigationItem[] = [
    { name: 'User Dashboard', href: '/user/dashboard', icon: LayoutDashboard, color: 'text-blue-400' },
    { name: 'My Tickets', href: '/user/tickets', icon: Ticket, color: 'text-emerald-600' },
    { name: 'Help Portal', href: '/user/support', icon: MessageSquare, color: 'text-orange-500' },
]

export function Sidebar() {
    const pathname = usePathname()
    const [isHovered, setIsHovered] = useState(false)
    const { user, logout } = useAuth()

    const navigation = user?.role === 'admin' ? adminNavigation : userNavigation

    return (
        <div
            className={cn(
                "group/sidebar flex flex-col h-screen sticky top-0 p-4 font-sans z-50 overflow-hidden transition-all duration-500 ease-in-out select-none",
                isHovered ? "w-[300px]" : "w-[104px]"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="absolute inset-0 bg-background -z-10" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 dark:opacity-20 pointer-events-none -z-10" />

            <div className="flex flex-col h-full rounded-lg glass-dark border-border shadow-md relative overflow-hidden transition-all duration-500">
                <div className="py-6 flex items-center justify-center border-b border-border overflow-hidden no-scrollbar">
                    <div className={cn("flex items-center shrink-0 transition-all duration-500", isHovered ? "gap-4" : "gap-0")}>
                        <div className="relative group shrink-0">
                            <img
                                src="/Grid.png"
                                alt="GRID Logo"
                                className="h-24 w-24 object-contain rounded-lg"
                            />
                        </div>
                        <div className={cn(
                            "transition-all duration-500 whitespace-nowrap group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0",
                            isHovered ? "opacity-100 translate-x-0 w-auto" : "opacity-0 -translate-x-4 pointer-events-none w-0 overflow-hidden"
                        )}>
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-lg text-foreground tracking-tight block leading-none">GRID</span>
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[7px] font-black uppercase tracking-widest px-1 py-0 h-3">Team 31</Badge>
                            </div>
                            <span className="text-[10px] font-bold text-[#0070AD] tracking-[0.1em] uppercase">Control Plane</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 no-scrollbar scroll-smooth">
                    <div className={cn(
                        "px-4 mb-2 transition-all duration-300 group-hover/sidebar:opacity-100",
                        isHovered ? "opacity-100" : "opacity-0"
                    )}>
                        <p className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.1em] whitespace-nowrap">Navigation</p>
                    </div>
                    <nav className="space-y-1 no-scrollbar">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "group relative flex items-center h-12 rounded-lg transition-all duration-200 overflow-hidden",
                                        isActive
                                            ? "bg-slate-100 dark:bg-slate-800 text-primary dark:text-white border border-border shadow-sm font-bold"
                                            : "text-slate-500 hover:text-foreground hover:bg-slate-50 dark:hover:bg-slate-800/50",
                                        isHovered ? "px-3" : "px-[16px]"
                                    )}
                                >
                                    <item.icon className={cn(
                                        "shrink-0 h-5 w-5 transition-all duration-300",
                                        isActive ? "text-primary" : "group-hover:text-primary"
                                    )} />
                                    <span className={cn(
                                        "ml-3 flex-1 text-sm transition-all duration-500 whitespace-nowrap group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0",
                                        isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
                                    )}>
                                        {item.name}
                                    </span>
                                    {item.isDev && isHovered && (
                                        <Badge variant="outline" className="ml-auto text-[8px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/20 uppercase font-black tracking-widest leading-none">
                                            Dev
                                        </Badge>
                                    )}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Node Health Section Removed */}
                </div>

                <div className="p-2 mt-auto no-scrollbar">
                    <div
                        onClick={logout}
                        className={cn(
                            "bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-border flex items-center transition-all duration-500 group cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-900/20",
                            isHovered ? "p-3 gap-3" : "p-2 justify-center"
                        )}
                    >
                        <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-foreground group-hover:text-rose-500 transition-colors shrink-0">
                            <LogOut className="h-4 w-4" />
                        </div>
                        <div className={cn(
                            "flex-1 overflow-hidden transition-all duration-500",
                            isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none w-0"
                        )}>
                            <p className="text-[10px] font-bold text-foreground truncate leading-none uppercase tracking-tight">
                                {user?.name || user?.email}
                            </p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1 group-hover:text-rose-500">Terminate Session</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
