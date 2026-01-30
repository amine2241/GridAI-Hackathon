'use client';

import React from 'react';
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";

export const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isLoading } = useAuth();
    const pathname = usePathname();

    const isLoginPage = pathname === '/login';
    const isPublicChat = pathname === '/public-chat';
    const isChatbotEmbed = pathname === '/chatbot-embed';

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#0070AD] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium animate-pulse">Initializing System...</p>
                </div>
            </div>
        );
    }

    // Unauthorized access -> Login with redirect
    if (!user && !isLoginPage && !isPublicChat && !isChatbotEmbed && (pathname.startsWith('/admin') || pathname.startsWith('/user') || pathname === '/' || pathname === '/incidents')) {
        const searchParams = typeof window !== 'undefined' ? window.location.search : '';
        const redirectUrl = encodeURIComponent(pathname + searchParams);
        window.location.href = `/login?redirect=${redirectUrl}`;
        return null;
    }

    // Role-based access control
    if (user) {
        if (user.role === 'user') {
            // User trying to access admin routes
            const isAdminRoute = pathname === '/' ||
                pathname.startsWith('/admin') ||
                pathname.startsWith('/incidents') ||
                pathname.startsWith('/agents') ||
                pathname.startsWith('/workflows') ||
                pathname.startsWith('/integrations') ||
                pathname.startsWith('/logs') ||
                pathname.startsWith('/settings');

            if (isAdminRoute) {
                window.location.href = '/user/dashboard';
                return null;
            }
        } else if (user.role === 'admin') {
            // Admin trying to access user routes
            if (pathname.startsWith('/user')) {
                window.location.href = '/';
                return null;
            }
        }
    }

    // No sidebar for login page, public chat, or chatbot embed
    if (isLoginPage || isPublicChat || isChatbotEmbed) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen relative overflow-hidden bg-background">
            {user && <Sidebar />}

            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {user && <Topbar />}
                <main className="flex-1 overflow-y-auto p-4 lg:p-8 pt-0 custom-scrollbar">
                    <div className={cn(
                        "mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 h-full",
                        pathname !== '/admin/chatbot' && pathname !== '/user/support' && "max-w-7xl"
                    )}>
                        {children}
                    </div>
                </main>
            </div>

        </div>
    );
};
