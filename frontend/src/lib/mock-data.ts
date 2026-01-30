import { Agent, Incident, Integration, ExecutionLog, Workflow } from "@/types";

export const mockAgents: Agent[] = [
    {
        id: "1",
        name: "Triage Sentinel",
        type: "Triage",
        status: "Active",
        priority: 1,
        description: "Analyzes incoming energy grid alerts and categorizes them by urgency.",
        systemPrompt: "You are the Triage Sentinel. Your goal is to analyze incident descriptions and determine if they relate to 'Transmission failure', 'Substation leak', or 'Customer billing'.",
        tools: ["Knowledge Base"],
        executionMode: "Automatic",
        inputSchema: '{"alert_id": "string", "severity": "number"}',
        outputSchema: '{"category": "string", "escalation_required": "boolean"}',
        createdAt: "2023-10-01T08:00:00Z",
    },
    {
        id: "2",
        name: "SNOW Sync",
        type: "ServiceNow",
        status: "Active",
        priority: 2,
        description: "Integrates directly with ServiceNow to create and update incidents.",
        systemPrompt: "You are the ServiceNow Integrator. Use the provided API schema to update incident status based on field reports.",
        tools: ["ServiceNow"],
        executionMode: "Human Approval",
        inputSchema: '{"incident_id": "string", "update_notes": "string"}',
        outputSchema: '{"status": "success", "sys_id": "string"}',
        createdAt: "2023-10-02T10:30:00Z",
    },
    {
        id: "3",
        name: "Knowledge Crawler",
        type: "Knowledge",
        status: "Active",
        priority: 3,
        description: "Retrieves technical documents and maintenance logs from the Vector DB.",
        systemPrompt: "Search the knowledge base for 'Standard Operating Procedures' related to transformer maintenance.",
        tools: ["Knowledge Base"],
        executionMode: "Automatic",
        inputSchema: '{"query": "string"}',
        outputSchema: '{"documents": "array"}',
        createdAt: "2023-10-05T14:15:00Z",
    },
    {
        id: "4",
        name: "Web Investigator",
        type: "Web Search",
        status: "Inactive",
        priority: 4,
        description: "Researches weather patterns and external news affecting the energy grid.",
        systemPrompt: "Forecast impact of upcoming storm events using web search data.",
        tools: ["Web Search"],
        executionMode: "Human Approval",
        inputSchema: '{"location": "string", "event": "string"}',
        outputSchema: '{"risk_score": "number", "summary": "string"}',
        createdAt: "2023-10-10T09:00:00Z",
    }
];

export const mockIncidents: Incident[] = [
    {
        id: "INC0012345",
        title: "Transformer Leak at Substation 42",
        status: "New",
        priority: "Critical",
        serviceNowId: "SY-9912",
        summary: "A cooling oil leak was detected by IoT sensors in Substation 42. Potential risk of overheating and fire.",
        description: "Sensor data indicates a drop in oil pressure. Visual inspection suggested in the next hour.",
        agentAnalysis: [
            {
                agentName: "Triage Sentinel",
                content: "Incident categorized as 'Infrastructure Failure - Critical'. Immediate response required.",
                timestamp: "2023-10-24T10:05:00Z"
            },
            {
                agentName: "Knowledge Crawler",
                content: "Retrieved SOP for Transformer type XT-500. Recommend immediate offline transition.",
                timestamp: "2023-10-24T10:07:00Z"
            }
        ],
        timeline: [
            { action: "Incident Detected", timestamp: "2023-10-24T10:00:00Z" },
            { action: "Agent 'Triage Sentinel' assigned", timestamp: "2023-10-24T10:02:00Z", agentName: "System" },
            { action: "Analysis Complete", timestamp: "2023-10-24T10:05:00Z", agentName: "Triage Sentinel" }
        ],
        createdAt: "2023-10-24T10:00:00Z"
    },
    {
        id: "INC0012346",
        title: "Billing Discrepancy - Industrial Account",
        status: "In Progress",
        priority: "Medium",
        serviceNowId: "SY-9915",
        summary: "Large industrial client reporting 20% surge in billing without corresponding usage increase.",
        description: "Account manager requested AI audit of meter readings vs billing records.",
        timeline: [
            { action: "Ticket Created", timestamp: "2023-10-23T15:00:00Z" },
            { action: "Agent 'Analysis Pro' started audit", timestamp: "2023-10-23T15:10:00Z", agentName: "System" }
        ],
        createdAt: "2023-10-23T15:00:00Z"
    }
];

export const mockIntegrations: Integration[] = [
    {
        id: "1",
        name: "ServiceNow Production",
        type: "ServiceNow",
        status: "Connected",
        config: {
            instanceUrl: "https://energygrid-prod.service-now.com",
            authType: "OAuth"
        }
    },
    {
        id: "2",
        name: "Google Search API",
        type: "Web Search",
        status: "Connected",
        config: {
            provider: "Google",
            rateLimit: "1000/day"
        }
    },
    {
        id: "3",
        name: "Vector Knowledge Base",
        type: "Knowledge Base",
        status: "Connected",
        config: {
            status: "Indexed",
            filesCount: 1240
        }
    }
];

export const mockLogs: ExecutionLog[] = [
    {
        id: "L1",
        timestamp: "2023-10-24T10:05:00Z",
        agentName: "Triage Sentinel",
        incidentId: "INC0012345",
        status: "Success",
        input: '{"alert_id": "AL-55", "sensor_val": 12.5}',
        output: '{"result": "Critical - Oil Leak", "confidence": 0.98}'
    },
    {
        id: "L2",
        timestamp: "2023-10-24T10:07:00Z",
        agentName: "Knowledge Crawler",
        incidentId: "INC0012345",
        status: "Success",
        input: '{"query": "XT-500 Transformer SOP"}',
        output: '{"docs": ["SOP-441-Leak-Fix.pdf"]}'
    },
    {
        id: "L3",
        timestamp: "2023-10-24T10:10:00Z",
        agentName: "SNOW Sync",
        incidentId: "INC0012345",
        status: "Failure",
        input: '{"update": "Status to In Progress"}',
        output: "",
        error: "401 Unauthorized - Token Expired"
    }
];

export const mockWorkflows: Workflow[] = [
    {
        id: "W1",
        name: "Emergency Incident Response",
        description: "Automatically triggered for Critical incidents.",
        status: "Active",
        steps: [
            { id: "S1", agentId: "1", order: 1 },
            { id: "S2", agentId: "3", order: 2 },
            { id: "S3", agentId: "2", order: 3 }
        ]
    }
];
