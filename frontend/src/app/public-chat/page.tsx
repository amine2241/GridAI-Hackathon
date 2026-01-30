'use client';

import React from 'react';
import { Bot, Zap, Shield, Globe, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ChatWidget } from '@/components/chatbot/ChatWidget';

export default function PublicChatPage() {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30 overflow-x-hidden">
            {/* Navigation */}
            <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">Grid<span className="text-cyan-400">AI</span></span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
                        <a href="#" className="hover:text-white transition-colors">Solutions</a>
                        <a href="#" className="hover:text-white transition-colors">Platform</a>
                        <a href="#" className="hover:text-white transition-colors">Documentation</a>
                        <a href="#" className="hover:text-white transition-colors">Enterprise</a>
                    </div>

                    <Link
                        href="/login"
                        className="px-4 py-2 bg-zinc-900 border border-white/10 text-white font-medium rounded-lg hover:bg-zinc-800 hover:border-white/20 transition-all text-sm"
                    >
                        Employee Login
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-400 mb-8 hover:bg-cyan-500/20 transition-colors cursor-pointer">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        Next-Gen Energy Grid Operations
                        <ArrowRight className="w-3 h-3" />
                    </div>

                    <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                        Intelligent Grid Support<br />
                        <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">For Utility Enterprises.</span>
                    </h1>

                    <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                        Experience the evolution of utility asset management. Our neural AI agents monitor grid telemetry,
                        predict maintenance needs, and resolve technical incidents across your distribution network.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg font-bold text-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all active:scale-95">
                            Enterprise Access
                        </button>
                        <button className="px-8 py-4 bg-zinc-900 border border-white/10 rounded-lg font-bold text-lg hover:bg-zinc-800 transition-all">
                            Grid Operations Demo
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid Features */}
            <div className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        {
                            icon: Zap,
                            title: "Smart Grid Intelligence",
                            desc: "Real-time AI analysis of power distribution telemetry and substation health metrics."
                        },
                        {
                            icon: Shield,
                            title: "Infrastructure Security",
                            desc: "Enterprise-grade protection for critical utility data and automated incident triage."
                        },
                        {
                            icon: Globe,
                            title: "Network-Wide Support",
                            desc: "24/7 technical assistance for field engineers and operations centers across the territory."
                        }
                    ].map((feature, i) => (
                        <div key={i} className="p-8 rounded-lg bg-zinc-900/50 border border-white/5 hover:bg-zinc-900/80 transition-colors group">
                            <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <feature.icon className="w-6 h-6 text-cyan-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                            <p className="text-zinc-400 leading-relaxed">
                                {feature.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-white/10 py-12 bg-black">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-zinc-500 text-sm">
                    <p>© 2026 Grid AI Inc. All rights reserved.</p>
                    <div className="flex gap-6 mt-4 md:mt-0">
                        <a href="#" className="hover:text-white">Privacy</a>
                        <a href="#" className="hover:text-white">Terms</a>
                        <a href="#" className="hover:text-white">Twitter</a>
                    </div>
                </div>
            </footer>

            {/* Embedded Public Chat Widget */}
            <ChatWidget
                publicMode={true}
                agentName="Grid Neural Assistant"
                welcomeMessage="GRID established. I am ready to assist with grid operations, technical documentation, and incident reporting. How can I help you today?"
                primaryColor="#06b6d4" // Cyan-500
            />
        </div>
    );
}
