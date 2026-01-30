import React, { useState } from "react"
import { Globe, Download, Check, Copy, Code2, Layers, Terminal, MonitorSmartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/config"
import { Badge } from "@/components/ui/badge"

interface DeploymentTabsProps {
  agentName: string
  welcomeMessage: string
  primaryColor: string
  capabilities: any
  selectedWorkflowId: string
}

export const DeploymentTabs: React.FC<DeploymentTabsProps> = ({
  agentName,
  welcomeMessage,
  primaryColor,
  capabilities,
  selectedWorkflowId
}) => {
  const [copied, setCopied] = useState(false)

  const embedUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/chatbot-embed?name=${encodeURIComponent(agentName)}&welcome=${encodeURIComponent(welcomeMessage)}&color=${encodeURIComponent(primaryColor)}${selectedWorkflowId !== 'default' ? `&workflowId=${selectedWorkflowId}` : ''}`;

  const iframeSnippet = `<iframe 
  src="${embedUrl}"
  width="400"
  height="600"
  frameborder="0"
  style="border:none; border-radius:16px; box-shadow: 0 8px 32px rgba(0,0,0,0.2);"
></iframe>`.trim();

  const jsSnippet = `<!-- AI Control Plane Chatbot Integration -->
<div id="aicp-chatbot-root"></div>

<script>
(function() {
  const container = document.getElementById('aicp-chatbot-root');
  
  // Create toggle button
  const button = document.createElement('button');
  button.innerHTML = '💬';
  button.style.cssText = \`
    position:fixed;bottom:24px;right:24px;z-index:9999;
    width:64px;height:64px;border-radius:16px;border:none;
    background:${primaryColor};color:white;font-size:28px;
    cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,0.15);
    transition:transform 0.2s;\`;
  
  // Create iframe container
  const iframeContainer = document.createElement('div');
  iframeContainer.style.cssText = \`
    display:none;position:fixed;bottom:100px;right:24px;z-index:9999;
    width:400px;height:600px;border-radius:16px;overflow:hidden;
    box-shadow:0 8px 32px rgba(0,0,0,0.2);background:white;\`;
  
  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = "${embedUrl}";
  iframe.style.cssText = 'width:100%;height:100%;border:none;';
  
  iframeContainer.appendChild(iframe);
  document.body.appendChild(button);
  document.body.appendChild(iframeContainer);

  button.onclick = () => {
    const isHidden = iframeContainer.style.display === 'none';
    iframeContainer.style.display = isHidden ? 'block' : 'none';
    button.style.transform = isHidden ? 'scale(0.9)' : 'scale(1)';
  };
})();
</script>`.trim()

  const reactSnippet = `import React, { useState } from 'react';
import { ChatWidget } from '@/components/chatbot/ChatWidget';

// Copy the ChatWidget component from:
// src/components/chatbot/ChatWidget.tsx

export default function MyChatPage() {
  return (
    <div>
      <ChatWidget
        agentName="${agentName}"
        welcomeMessage="${welcomeMessage}"
        primaryColor="${primaryColor}"
        capabilities={${JSON.stringify(capabilities, null, 2)}}
        mode="widget"
        isOpenByDefault={false}
        workflowId={${selectedWorkflowId === 'default' ? 'undefined' : `"${selectedWorkflowId}"`}}
      />
    </div>
  );
}
`.trim()

  const apiDocumentation = {
    chat: {
      endpoint: `${API_BASE_URL}/chat`,
      method: "POST",
      description: "Main chat endpoint for authenticated users. Uses the supervisor graph for intelligent routing.",
      request: {
        message: "I need help with my power meter",
        thread_id: "user-session-123",
        workflow_id: selectedWorkflowId === 'default' ? null : selectedWorkflowId
      }
    },
    publicChat: {
      endpoint: `${API_BASE_URL}/chat`,
      method: "POST",
      description: "Unauthenticated chat endpoint using the Knowledge Agent. Ideal for public portals.",
      request: {
        message: "How do I check grid health?",
        thread_id: "anonymous-session-456"
      }
    },
    history: {
      endpoint: `${API_BASE_URL}/chat/history/{thread_id}`,
      method: "GET",
      description: "Retrieve message history for a specific conversation thread."
    }
  };

  const apiSnippet = `
# 1. Main Chat (Authenticated)
curl -X POST ${apiDocumentation.chat.endpoint} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '${JSON.stringify(apiDocumentation.chat.request, null, 2)}'

# 2. Public Chat (Unauthenticated)
curl -X POST ${apiDocumentation.publicChat.endpoint} \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(apiDocumentation.publicChat.request, null, 2)}'

# 3. Session History
curl -X GET ${apiDocumentation.history.endpoint.replace('{thread_id}', 'user-session-123')} \\
  -H "Authorization: Bearer YOUR_TOKEN"
`.trim();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Code copied to clipboard!", {
      description: "You can now paste it into your project",
      duration: 3000
    })
  }

  return (
    <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
      <Tabs defaultValue="web" className="space-y-8">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Deployment Code</h3>
          </div>
          <TabsList className="bg-muted p-1 h-10 rounded-lg space-x-1">
            <TabsTrigger value="web" className="rounded-lg text-[10px] font-bold uppercase tracking-widest px-4 data-[state=active]:bg-card shadow-sm border-transparent data-[state=active]:border-border border">Vanilla JS</TabsTrigger>
            <TabsTrigger value="iframe" className="rounded-lg text-[10px] font-bold uppercase tracking-widest px-4 data-[state=active]:bg-card shadow-sm border-transparent data-[state=active]:border-border border">Iframe Embed</TabsTrigger>
            <TabsTrigger value="react" className="rounded-lg text-[10px] font-bold uppercase tracking-widest px-4 data-[state=active]:bg-card shadow-sm border-transparent data-[state=active]:border-border border">React/Next</TabsTrigger>
            <TabsTrigger value="api" className="rounded-lg text-[10px] font-bold uppercase tracking-widest px-4 data-[state=active]:bg-card shadow-sm border-transparent data-[state=active]:border-border border">REST API</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="web" className="space-y-6 mt-0">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pure JavaScript (One-line Snippet)</h4>
            <div className="flex gap-2">
              <Button
                onClick={() => copyToClipboard(jsSnippet)}
                variant="ghost"
                size="sm"
                className="h-8 text-[10px] font-bold uppercase text-primary gap-1.5"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy Code"}
              </Button>
            </div>
          </div>
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-xs text-primary font-medium">
            ⚡ <strong>Floating Widget!</strong> This script adds a floating chat button to any website that opens the full-featured chatbot.
          </div>
          <pre className="p-6 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs overflow-x-auto text-emerald-400 leading-relaxed shadow-inner max-h-[500px]">
            <code>{jsSnippet}</code>
          </pre>
        </TabsContent>

        <TabsContent value="iframe" className="space-y-6 mt-0">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Static Iframe (For Sidebars/Portals)</h4>
            <div className="flex gap-2">
              <Button
                onClick={() => copyToClipboard(iframeSnippet)}
                variant="ghost"
                size="sm"
                className="h-8 text-[10px] font-bold uppercase text-primary gap-1.5"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy Code"}
              </Button>
            </div>
          </div>
          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg text-xs text-blue-600 dark:text-blue-400 font-medium">
            🖼️ <strong>Embedded View!</strong> Perfect for integrating the chat directly into a sidebar or a specific page section.
          </div>
          <pre className="p-6 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs overflow-x-auto text-blue-400 leading-relaxed shadow-inner max-h-[500px]">
            <code>{iframeSnippet}</code>
          </pre>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-border bg-muted/30 flex flex-col items-center gap-2 shadow-sm">
              <MonitorSmartphone className="h-6 w-6 text-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-center">Responsive Design</span>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/30 flex flex-col items-center gap-2 shadow-sm">
              <Globe className="h-6 w-6 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-center">Cross-Domain Ready</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="react" className="space-y-6 mt-0">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">React / Next.js Component</h4>
            <Button onClick={() => copyToClipboard(reactSnippet)} variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase text-primary gap-1.5">
              <Copy className="h-3 w-3" /> Copy Component
            </Button>
          </div>
          <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg text-xs text-purple-600 dark:text-purple-400 font-medium">
            📦 <strong>Copy the ChatWidget component</strong> from <code className="bg-purple-500/10 px-1 py-0.5 rounded font-bold">src/components/chatbot/ChatWidget.tsx</code> and customize as needed.
          </div>
          <pre className="p-6 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs overflow-x-auto text-cyan-400 leading-relaxed shadow-inner max-h-[500px]">
            <code>{reactSnippet}</code>
          </pre>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-border bg-muted/30 flex flex-col items-center gap-2 shadow-sm">
              <Code2 className="h-6 w-6 text-cyan-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-center">Full TypeScript Support</span>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/30 flex flex-col items-center gap-2 shadow-sm">
              <Layers className="h-6 w-6 text-purple-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-center">Tailwind Styled</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-6 mt-0 overflow-y-auto max-h-[600px] pr-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Neural API Documentation</h4>
            <Button onClick={() => copyToClipboard(apiSnippet)} variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase text-primary gap-1.5">
              <Terminal className="h-3 w-3" /> Copy Full Spec
            </Button>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-amber-500 text-white border-none text-[8px] uppercase">Post</Badge>
                <code className="text-xs font-bold text-amber-700 dark:text-amber-400">/chat</code>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Connects to the full multi-agent system. Requires <code className="bg-amber-500/10 px-1 rounded">auth_token</code> in headers.
              </p>
            </div>

            <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-cyan-500 text-white border-none text-[8px] uppercase">Post</Badge>
                <code className="text-xs font-bold text-cyan-700 dark:text-cyan-400">/chat</code>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Guest access for public inquiries. No authentication required. Limited to knowledge retrieval.
              </p>
            </div>

            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-emerald-500 text-white border-none text-[8px] uppercase">Get</Badge>
                <code className="text-xs font-bold text-emerald-700 dark:text-emerald-400">/chat/history/{'{thread_id}'}</code>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Restores conversation context for a specific session. Returns an array of message objects.
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute top-4 right-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-primary transition-colors">Bash Example</div>
            <pre className="p-6 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[11px] overflow-x-auto text-amber-400 leading-relaxed shadow-inner">
              <code>{apiSnippet}</code>
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
