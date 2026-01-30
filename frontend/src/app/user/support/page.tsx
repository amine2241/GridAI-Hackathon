"use client"

import { ChatWidget } from "@/components/chatbot/ChatWidget"
import { useSearchParams } from "next/navigation"

export default function UserSupportPage() {
    const searchParams = useSearchParams()
    const mode = searchParams.get('mode') || 'chat'

    return (
        <div className="h-[calc(100vh-100px)] w-full py-4 overflow-hidden">
            <div className="h-full w-full rounded-lg overflow-hidden shadow-2xl border border-border bg-card">
                <ChatWidget
                    title="AI System"
                    description="Neural Support Link"
                    mode="embedded"
                    showActivityPanel={false}
                />
            </div>
        </div>
    )
}
