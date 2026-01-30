'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatWidget } from '@/components/chatbot/ChatWidget';

function ChatbotEmbedContent() {
    const searchParams = useSearchParams();

    // Extract configuration from query parameters
    const agentName = searchParams.get('name') || "Grid Neural Assistant";
    const welcomeMessage = searchParams.get('welcome') || "GRID established. How can I assist you today?";
    const primaryColor = searchParams.get('color') || "#06b6d4";
    const workflowId = searchParams.get('workflowId') || undefined;

    return (
        <div className="w-screen h-screen bg-transparent overflow-hidden">
            <ChatWidget
                mode="embedded"
                publicMode={true}
                agentName={agentName}
                welcomeMessage={welcomeMessage}
                primaryColor={primaryColor}
                workflowId={workflowId}
                isOpenByDefault={true}
            />
        </div>
    );
}

export default function ChatbotEmbedPage() {
    return (
        <Suspense fallback={
            <div className="w-screen h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/20" />
                    <div className="h-4 w-32 bg-muted rounded" />
                </div>
            </div>
        }>
            <ChatbotEmbedContent />
        </Suspense>
    );
}
