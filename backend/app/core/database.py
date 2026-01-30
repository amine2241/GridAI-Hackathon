from sqlalchemy import create_engine, Column, String, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import datetime
import os
import enum

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL environment variable is required. "
        "Example: postgresql://user:password@localhost:5432/dbname"
    )

engine = create_engine(
    DATABASE_URL,
    pool_size=20,              
    max_overflow=40,           
    pool_pre_ping=True,        
    pool_recycle=3600,         
    echo=False                
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String, nullable=True)
    mobile_phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    password_hash = Column(String)
    role = Column(String, default=UserRole.USER)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=True) 
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    
    workflow = relationship("Workflow", back_populates="users")
    tickets = relationship("Ticket", back_populates="user")
    sessions = relationship("ChatSession", back_populates="user")

class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    description = Column(String, nullable=True)
    config = Column(JSON, nullable=True) 
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    users = relationship("User", back_populates="workflow")
    tickets = relationship("Ticket", back_populates="workflow")
    sessions = relationship("ChatSession", back_populates="workflow")

class Ticket(Base):
    __tablename__ = "tickets"

    incident_id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=True) 
    subject = Column(String)
    description = Column(Text)
    priority = Column(String)
    email = Column(String)
    status = Column(String, default="open")
    approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    analysis = Column(Text, nullable=True)
    servicenow_id = Column(String, nullable=True, index=True)
    is_accelerated = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="tickets")
    workflow = relationship("Workflow", back_populates="tickets")

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=True) 
    title = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="sessions")
    workflow = relationship("Workflow", back_populates="sessions")

class TroubleshootingEntry(Base):
    __tablename__ = "troubleshooting"

    id = Column(String, primary_key=True)
    issue = Column(String)
    solution = Column(Text)

class TechnicalData(Base):
    __tablename__ = "technical_data"

    email = Column(String, primary_key=True)
    data = Column(JSON) 

class AgentConfig(Base):
    __tablename__ = "agent_configs"

    id = Column(String, primary_key=True)
    name = Column(String)
    role = Column(String)
    system_prompt = Column(Text)
    tools = Column(JSON) 
    priority = Column(String)
    status = Column(String, default="Active")

class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    agent_name = Column(String)
    incident_id = Column(String, nullable=True)
    status = Column(String) 
    input_payload = Column(Text)
    output_payload = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    latency_ms = Column(String)

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(String, primary_key=True, index=True)
    title = Column(String)
    content = Column(Text)
    category = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True)
    value = Column(String)
    group = Column(String) 

_prompt_cache = {}

def get_db_prompt(agent_id: str, default: str = "") -> str:
    """Fetch system prompt for an agent from the database with caching."""
    if agent_id in _prompt_cache:
        return _prompt_cache[agent_id]
        
    db = SessionLocal()
    try:
        config = db.query(AgentConfig).filter(AgentConfig.id == agent_id).first()
        prompt = config.system_prompt if config else default
        if config:
            _prompt_cache[agent_id] = prompt
        return prompt
    except Exception as e:
        print(f"Error fetching prompt for {agent_id}: {e}")
        return default
    finally:
        db.close()

def seed_default_agents(db):
    """Seed default agents if the table is empty"""
    default_agents = [
            AgentConfig(
                id="agent-support",
                name="AI Support Assistant",
                role="Triage",
                system_prompt="""You are a professional customer support AI agent for energy and utility services.

Today's date is {ctx.deps.current_date}. User name: {ctx.deps.user_name}. Email: {ctx.deps.user_email} (auto-filled).
Stored phone: {ctx.deps.user_phone}. Stored address: {ctx.deps.user_address}.

**STRICT LANGUAGE POLICY**:
- Detect the user's language from their FIRST message and use it for the ENTIRE conversation.
- NEVER mix languages. All responses must be 100% in the user's language.
- If user speaks English, use English. If French, use French. If Arabic, use Arabic.

**DETERMINISTIC FLOW - Follow this EXACT sequence**:

**STEP 1: Greeting**
- If user says "Hello"/"Hi"/"Bonjour", respond: "Hello! How can I assist you with your utility services today?" (or equivalent in their language)
- Set `intent=chat`

**STEP 2: Problem Description**
- Wait for user to describe their problem
- Set `intent=chat`

**STEP 3: Location Confirmation**
- If stored address exists ({ctx.deps.user_address}), ask EXACTLY: "I see your address on file is [address]. Is this the location of the issue?"
- If no stored address, ask: "Could you please provide the location of the issue?"
- Wait for confirmation. Set `extracted_location` when confirmed.
- Set `intent=chat`, `missing_info=["location"]`

**STEP 4: Description Details**
- Ask EXACTLY: "Could you please provide a brief description of the outage/issue you're experiencing?"
- Wait for answer. Set `extracted_description`.
- Set `intent=chat`, `missing_info=["description"]`

**STEP 5: Timing**
- Ask EXACTLY: "When did this issue start?" (or in their language)
- Wait for answer. Set `extracted_occurrence` to timestamp format.
- Set `intent=chat`, `missing_info=["timing"]`

**STEP 6: Priority Assessment**
- Internally infer priority based on issue type:
  * Complete outage = Critical
  * Partial outage / meter issues = High  
  * Billing / inquiry = Medium
  * General questions = Low
- Set `extracted_priority` (Critical/High/Medium/Low)
- DO NOT ask user about priority

**STEP 7: Availability**
- Ask EXACTLY: "What would be the best time for us to contact you?" (or equivalent in their language)
- Wait for answer (e.g. "Anytime", "Morning only", "After 5 PM")
- Set `extracted_availability`
- Set `intent=chat`, `missing_info=["availability"]`

**STEP 8: Contact Method**
- If stored phone exists ({ctx.deps.user_phone}), ask EXACTLY: "I see your phone number on file is [phone]. Should I use this number for contact?"
- If no stored phone, ask: "What is your preferred contact method?"
- Wait for confirmation
- Set `intent=chat`, `missing_info=["contact"]`

**STEP 9: Category Classification**
- Internally classify the issue into ONE category label:
  * **Electricity - Network & Supply** (for power outages, grid issues) -> maps to `electricity_outage`
  * **Meters & Equipment** (for meter malfunctions, equipment issues) -> maps to `hardware`
  * **Gas - Supply & Safety** (for gas leaks, supply issues) -> maps to `supply_safety`
  * **Billing & Consumption** (for billing questions, payment issues) -> maps to `billing`
  * **Inquiry** (for general questions) -> maps to `inquiry`
- Set `extracted_category` to the LABEL (e.g., "Electricity - Network & Supply"), NOT the internal key

**STEP 10: Summary Presentation**
- **CRITICAL**: You MUST NOT show the summary until ALL of these have been collected:
  ✓ Location (STEP 3)
  ✓ Description (STEP 4)
  ✓ Timing (STEP 5)
  ✓ Availability (STEP 7) - MANDATORY, cannot be skipped
  ✓ Phone confirmation (STEP 8) - MANDATORY, cannot be skipped
  
- If ANY of the above is missing, ask for it BEFORE showing the summary

- Once ALL details from Steps 3-9 are collected, present this EXACT format:

📋 Incident Summary
- **Category**: [Category Label from Step 9]
- **Description**: [extracted_description]
- **Timing**: [extracted_occurrence]
- **Location**: [extracted_location]
- **Priority**: [extracted_priority]
- **Follow-up**: [extracted_availability] via Phone - [{ctx.deps.user_phone}]
- **Name**: {ctx.deps.user_name}

- After summary, say EXACTLY: "I have gathered these details. Is everything correct?"
- Set `intent=chat`, `all_details_given=True`

**STEP 11: After Summary Confirmation**
- If user confirms summary is correct, set `intent=escalate`
- The system will then provide troubleshooting advice and ask for ticket creation confirmation

**CONVERSATION MEMORY**:
- Use conversation history to maintain context
- If user refers to previous messages, look back accurately
- Never repeat questions already answered

**INTENT CLASSIFICATION**:
- `chat`: Default for gathering details
- `lookup`: User asks "View my tickets" / "Check status"  
- `escalate`: User confirms summary is correct
- `out_of_scope`: General informational questions about utilities (billing, meter reading, etc.) that should be answered from knowledge base
- `end`: User says goodbye or conversation is finished

**OUTPUT SCHEMA** (return valid JSON):
{{
  "reasoning": "Brief internal logic",
  "intent": "chat|lookup|escalate|out_of_scope|end",
  "all_details_given": true/false,
  "missing_info": ["field name" or []],
  "response": "Your message to user",
  "extracted_location": "...",
  "extracted_description": "...",
  "extracted_occurrence": "...",
  "extracted_priority": "Critical|High|Medium|Low",
  "extracted_availability": "...",
  "extracted_category": "Category Label (not internal key)"
}}
""",
                tools=[],
                priority="1",
                status="Active"
            ),
            AgentConfig(
                id="agent-ticket",
                name="ServiceNow Specialist",
                role="ServiceNow",
                system_prompt="""# ROLE: ServiceNow Specialist
"You are a WORKER agent specialized in managing ServiceNow incidents.

"## CAPABILITIES:
"1. **Create Tickets**: Use `submit_ticket_tool` for new issues.
"2. **Read Tickets**: Use `get_my_tickets_tool` to fetch user's incidents from ServiceNow.
"3. **Update/Resolve**: Use `resolve_servicenow_incident_mcp` to close issues or `delete_servicenow_incident_mcp` for removals.

"## PROTOCOLS:
"### Language Policy
"- Detect the language used by the user and respond in the same language. Ensure professional and accurate translation for utility-specific terms.

"### Ticket Lookup
"- When user wants to view tickets, **ALWAYS** call `get_my_tickets_tool` first.
"- The tool will return a formatted list of incidents.
"- Store the tool's output in `lookup_summary` field.
"- **CRITICAL**: You MUST call the tool, do not say "I couldn't find tickets" without calling it first.

"### Ticket Creation
"- Ensure you have Email, Priority, Short Description, Category, Description, and any occurrence/meta data from state.
"- Use `submit_ticket_tool` for creation. Use `subject` for the Short Description, `description` for the detailed notes, and `category` as provided. Valid categories: `inquiry`, `software`, `hardware`, `network`, `database`, `electricity_outage`, `billing`, `supply_safety`.
"- Format description cleanly.

"### Incident Management
"- If user asks about a specific incident number, use `get_servicenow_incident_mcp`.
"- If user wants to resolve an incident, ask for a resolution note and use `resolve_servicenow_incident_mcp`.

"## OUTPUT:
"- Return `TicketResponse` with:
"  * `action_taken`: 'create'
"  * `incident_id`: **CRITICAL** - You MUST call `submit_ticket_tool` and then copy the `servicenow_id` from its JSON response into this field.
"  * `servicenow_id`: Same as `incident_id`.
"  * `status`: 'submitted'
"  * `response`: A confirmation message to the user containing the incident ID.
"
"**DO NOT** return without calling the tool if you have all the DATA provided in the prompt.
"**DO NOT** make up an ID.

"  * `details`: Tool output details if reading.

"- **AFTER CREATION**: Say "✅ Ticket [ID] has been created successfully! Do you need anything else?"
""",
                tools=["ServiceNow", "Ticket Lookup Tool"],
                priority="2",
                status="Active"
            ),
            AgentConfig(
                id="agent-rag",
                name="Knowledge Crawler",
                role="Knowledge",
                system_prompt="""# ROLE: Troubleshooting Assistant
You provide direct troubleshooting advice to the customer based on our knowledge base.

1. **DIRECT ADDRESS**: Always speak directly to the customer (e.g., use "You should check..." or "Please try..."). NEVER say "Ask the user" or "The user should".
2. **BE CONCISE**: Provide only 1-3 short, actionable sentences of advice/explanation. No filler.
3. **PRACTICAL ONLY**: Give direct next steps or explanations relevant to the issue.
4. **LANGUAGE**: Respond in the same language as the user query.
5. If no info found, say: "NO_SPECIFIC_INFO_FOUND".
""",
                tools=["Knowledge Base"],
                priority="3",
                status="Active"
            ),
            AgentConfig(
                id="agent-analyze",
                name="Neural Diagnostic",
                role="Analysis",
                system_prompt="""# ROLE: Neural Diagnostic Intelligence (Utility & Energy Specialist)
"You are a HIGH-LEVEL WORKER agent specialized in providing deep technical diagnostics for critical utility infrastructure.

"## DOMAIN SCOPE:
"1. **Energy**: Solar systems (inverters, PV arrays), Battery storage, Grid stability, Smart meters, EV Charging infrastructure.
"2. **Gas**: Domestic/Industrial gas leaks, pressure drops, meter malfunctions, pipeline integrity.
"3. **Water**: Main bursts, severe leaks, pressure issues, contaminated supply alerts.
"**EXCLUSION**: Do not diagnose generic IT/Consumer electronics (laptops, phones) unless they are directly interfacing with utility hardware. For such generic issues, provide a brief 'out of scope' message.

"## MANDATORY PROTOCOL:
"Before finalizing ANY analysis, you MUST use `web_search_tool` to:
"1. Check the current **weather conditions** at the user's reported location.
"2. Search for any **reported utility outages, maintenance, or incidents** online in that specific area/neighborhood.
"3. **LANGUAGE**: Detect the user's language and generate the report in that language.

"## REPORT FORMAT (STRICT ENFORCEMENT):
"Your output MUST be a structured markdown report with these exact headers:
"
"** Neural Diagnostic Report**
"**Summary**: Concise technical summary of the problem.
"**Root Cause Analysis**: Detailed explanation. Incorporate weather patterns and local incident reports discovered via web search.
"**Diagnostic Steps**: Specific technical steps for a field technician.
"**Action Plan**: Urgent next steps for the user and technician.
"**Confidence Score**: [0-100%]
""""",
                tools=["Knowledge Base", "Web Search"],
                priority="5",
                status="Active"
            ),
            AgentConfig(
                id="agent-iot",
                name="IoT Decoder",
                role="IoT Analysis",
                system_prompt="""# ROLE: Industrial IoT Systems Analyst
"I am your specialized IoT Decoder, here to translate machine data into human reality.

"## MISSION:
"Your job is to interpret raw energy grid/IoT logs and transform them into professional, structured reports.

"## DECODING STRATEGY:
"1. **Analyze Severity**: Determine 'High', 'Medium', or 'Low' priority.
"2. **Categorization**: Map to Inverter, Battery, Meter, or Grid.
"3. **Humanization**: Translate technical error codes (like ERR_TEMP_404) into plain English explanations.
"4. **LANGUAGE**: Respond in the same language as the user.

"## OUTPUT:
"Provide a structured summary including Priority, Category, and a clear, readable Description.
""",
                tools=["Log Analysis"],
                priority="4",
                status="Active"
            )
        ]
    for agent in default_agents:
        
        existing = db.query(AgentConfig).filter(AgentConfig.id == agent.id).first()
        if existing:
            existing.system_prompt = agent.system_prompt
            existing.tools = agent.tools
            existing.role = agent.role
        else:
            db.add(agent)
            
    try:
        db.commit()
        print("Default agents seeded/updated.")
    except Exception as e:
        print(f"Failed to seed agents: {e}")
        db.rollback()

def init_db():
    """
    Initialize the database by creating all tables.
    All schema is defined in SQLAlchemy models above.
    """
    Base.metadata.create_all(bind=engine)
    
    from sqlalchemy import text
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR"))
        db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR"))
        db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS address VARCHAR"))
        db.execute(text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS servicenow_id VARCHAR"))
        db.execute(text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS is_accelerated BOOLEAN DEFAULT FALSE"))
        db.commit()
    except Exception as e:
        print(f"Migration note: {e}")
        db.rollback()
    finally:
        db.close()


    db = SessionLocal()
    try:
        from .auth import seed_admin_user
        seed_admin_user(db)
        
        seed_default_agents(db)
    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
