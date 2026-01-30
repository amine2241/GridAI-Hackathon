'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";

export default function LoginPage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            const searchParams = new URLSearchParams(window.location.search);
            const redirectPath = searchParams.get('redirect');

            if (redirectPath) {
                router.push(decodeURIComponent(redirectPath));
            } else if (user.role === 'admin') {
                router.push('/admin');
            } else {
                router.push('/user/dashboard');
            }
        }
    }, [user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Get redirect path from query string
        const searchParams = new URLSearchParams(window.location.search);
        const redirectPath = searchParams.get('redirect');

        try {
            if (isRegistering) {
                const res = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, name }),
                });

                if (res.ok) {
                    const data = await res.json();
                    localStorage.removeItem('aicp_public_thread_id');
                    await login(data.access_token);
                    toast.success('Account created successfully!');

                    if (redirectPath) {
                        router.push(decodeURIComponent(redirectPath));
                    }
                } else {
                    const err = await res.json();
                    toast.error(err.detail || 'Registration failed');
                }
            } else {
                const formData = new FormData();
                formData.append('username', email);
                formData.append('password', password);

                const res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    body: formData,
                });

                if (res.ok) {
                    const data = await res.json();
                    localStorage.removeItem('aicp_public_thread_id');
                    await login(data.access_token);
                    toast.success('Welcome back!');

                    if (redirectPath) {
                        router.push(decodeURIComponent(redirectPath));
                    }
                } else {
                    toast.error('Invalid credentials');
                }
            }
        } catch (_error) {
            toast.error('Connection failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#0070AD]/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md p-8 relative z-10"
            >
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-8 shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0070AD] via-purple-500 to-[#0070AD]" />

                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-[#0070AD]/20 rounded-lg flex items-center justify-center mb-4 border border-[#0070AD]/30">
                            <ShieldCheck className="w-8 h-8 text-[#0070AD]" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            Control Plane Access
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest">Team 31</Badge>
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">
                            {isRegistering ? 'Initialize your operative account' : 'Authenticate to continue'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {isRegistering && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 ml-1">Full Identity</label>
                                <div className="relative">
                                    <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="John Doe"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0070AD]/50 transition-all font-medium"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 ml-1">Email Endpoint</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="email"
                                    required
                                    placeholder="name@company.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0070AD]/50 transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 ml-1">Access Key</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0070AD]/50 transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#0070AD] hover:bg-[#005a8c] text-white font-semibold py-3 rounded-lg transition-all shadow-lg shadow-[#0070AD]/20 flex items-center justify-center gap-2 group border border-white/10"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    {isRegistering ? 'Register Agent' : 'Initialize Session'}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
                        <button
                            onClick={() => setIsRegistering(!isRegistering)}
                            className="text-sm text-gray-400 hover:text-[#0070AD] transition-colors"
                        >
                            {isRegistering ? 'Already have an account? Login' : "Don't have access? Register"}
                        </button>

                        {/* <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-600">
                            <Sparkles className="w-3 h-3" />
                            System Secure & AI Powered
                        </div> */}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
