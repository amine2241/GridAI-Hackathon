export type AgentType = 'Triage' | 'ServiceNow' | 'Knowledge' | 'Web Search' | 'Analysis';
export type AgentStatus = 'Active' | 'Inactive';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  priority: number;
  description: string;
  systemPrompt: string;
  tools: string[];
  executionMode: 'Automatic' | 'Human Approval';
  inputSchema: string;
  outputSchema: string;
  createdAt: string;
}

export interface WorkflowStep {
  id: string;
  agentId: string;
  order: number;
  condition?: {
    field: string;
    operator: string;
    value: string;
  };
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: 'Active' | 'Draft';
}

export interface Incident {
  id: string;
  title: string;
  status: 'New' | 'AI analysis' | 'In Progress' | 'Resolved' | 'Closed' | 'Canceled';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  serviceNowId: string;
  summary: string;
  description: string;
  agentAnalysis?: {
    agentName: string;
    content: string;
    timestamp: string;
  }[];
  timeline: {
    action: string;
    timestamp: string;
    agentName?: string;
  }[];
  createdAt: string;
  contact_type?: string;
}

export interface Integration {
  id: string;
  name: string;
  type: 'ServiceNow' | 'Web Search' | 'Knowledge Base';
  status: 'Connected' | 'Disconnected' | 'Error' | 'Live_Sync' | 'RAG_Enabled' | 'DB_Offline' | 'Checking...';
  latency?: string;
  config: Record<string, unknown>;
}

export interface ExecutionLog {
  id: string;
  timestamp: string;
  agentName: string;
  incidentId?: string;
  status: 'Success' | 'Failure' | 'Pending';
  input: string;
  output: string;
  error?: string;
}
