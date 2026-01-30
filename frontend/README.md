# AI System Frontend (Next.js + Tailwind CSS)

This is the frontend dashboard for the AI System, built with Next.js.

## Setup

### Option 1: Docker (Recommended)
```bash
docker build -t ai-system-frontend .
docker run -p 3000:3000 ai-system-frontend
```

### Option 2: Local Development
1. **Install Node.js 18+**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment**:
   Update the `.env.local` file with:
   - `NEXT_PUBLIC_API_URL=http://localhost:8000`
4. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- **Dashboard**: Real-time stats and agent activity monitoring.
- **Chat**: Streaming interaction with the multi-agent system.
- **Admin**: Management of users, workflows, agents, and knowledge documents.
- **Incidents**: View and analyze ServiceNow incidents.
