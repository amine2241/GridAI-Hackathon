# AI System Backend (FastAPI + Pydantic AI + LangGraph)

This service provides a multi-agent system for client support and ticket creation.

## Setup

### Option 1: Docker (Recommended)
```bash
docker build -t ai-system-backend .
docker run -p 8000:8000 --env-file .env ai-system-backend
```

### Option 2: Local Development
1. **Install Python 3.9+**
2. **Create and Activate Virtual Environment**:
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Configure Environment**:
   Update the `.env` file with your `OPENAI_API_KEY`, `DATABASE_URL`, etc.
5. **Run the server**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   The server will run on `http://localhost:8000`.

## Agents

- **Client Support Agent**: Handles general inquiries and triages issues.
- **Ticket Creating Agent**: Gathers details (subject, description, email) and "creates" a ticket.

The agents use **LangGraph** to hand off control between each other in a coordinated system.
