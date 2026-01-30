"use client"

import { useState } from "react"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { AgentForm } from "@/components/agents/AgentForm"
import { Agent } from "@/types"
import { ChatWidget } from "@/components/chatbot/ChatWidget"
import { useAgents } from "@/hooks/useAgents"
import { AgentsHeader } from "@/components/agents/AgentsHeader"
import { AgentsTable } from "@/components/agents/AgentsTable"

export default function AgentsPage() {
    const {
        loading,
        searchQuery,
        setSearchQuery,
        sortBy,
        sortOrder,
        filteredAgents,
        toggleSort,
        deleteAgent,
        updateAgent,
        fetchAgents
    } = useAgents()

    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
    const [testAgent, setTestAgent] = useState<Agent | null>(null)

    const handleUpdate = async (values: Partial<Agent>) => {
        if (!editingAgent) return;
        const success = await updateAgent(editingAgent.id, values);
        if (success) setEditingAgent(null);
    }

    const onCreateSuccess = () => {
        setIsCreateOpen(false);
        fetchAgents();
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {testAgent && (
                <ChatWidget
                    agentName={`Testing: ${testAgent.name}`}
                    welcomeMessage={`Neural test link established for [${testAgent.name}]. Direct directive mode active.`}
                    primaryColor="#0070AD"
                    capabilities={{
                        voice: true,
                        video: true,
                        knowledge: true,
                        automation: true
                    }}
                    mode="widget"
                    isOpenByDefault={true}
                    agentId={testAgent.id}
                    onThreadChange={() => { }}
                    onClose={() => setTestAgent(null)}
                    showActivityPanel={false}
                />
            )}

            <AgentsHeader onCreateOpen={() => setIsCreateOpen(true)} />

            <AgentsTable
                agents={filteredAgents}
                loading={loading}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={toggleSort}
                onEdit={setEditingAgent}
                onTest={setTestAgent}
                onDelete={deleteAgent}
            />

            {/* Modals/Sheets */}
            <Sheet open={!!editingAgent} onOpenChange={() => setEditingAgent(null)}>
                <SheetContent className="sm:max-w-xl bg-background border-border text-foreground p-0 overflow-y-auto no-scrollbar rounded-lg">
                    <div className="p-8">
                        <SheetHeader className="mb-8">
                            <SheetTitle className="text-2xl font-bold tracking-tight uppercase px-2">Modify Alpha Node Directive</SheetTitle>
                            <SheetDescription className="text-sm font-medium text-muted-foreground px-2">Update the core prompt and metadata for {editingAgent?.name}.</SheetDescription>
                        </SheetHeader>
                        {editingAgent && (
                            <AgentForm
                                initialData={{
                                    name: editingAgent.name,
                                    type: editingAgent.type,
                                    description: editingAgent.description,
                                    systemPrompt: editingAgent.systemPrompt,
                                    tools: editingAgent.tools,
                                    executionMode: editingAgent.executionMode,
                                }}
                                onSubmit={handleUpdate}
                                onCancel={() => setEditingAgent(null)}
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <SheetContent className="sm:max-w-xl bg-background border-border text-foreground p-0 overflow-y-auto no-scrollbar rounded-lg">
                    <div className="p-8">
                        <SheetHeader className="mb-8">
                            <SheetTitle className="text-2xl font-bold tracking-tight uppercase">Initialising New Alpha Node</SheetTitle>
                            <SheetDescription className="text-sm font-medium text-muted-foreground">Define the genetic parameters and tools for a new autonomous agent.</SheetDescription>
                        </SheetHeader>
                        <AgentForm onSubmit={onCreateSuccess} onCancel={() => setIsCreateOpen(false)} />
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}
