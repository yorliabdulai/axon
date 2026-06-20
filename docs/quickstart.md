# Quick Start

Get a running Axon agent in under 30 minutes.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for Postgres + pgvector)

## Steps

### 1. Clone and install

```bash
git clone https://github.com/axon-ai/axon.git
cd axon
pnpm install
```

### 2. Start infrastructure

```bash
docker compose up -d postgres redis
cp .env.example .env
```

### 3. Build and run

```bash
pnpm build
pnpm --filter @axon-ai/core dev
```

### 4. Test the agent

```bash
curl -X POST http://localhost:3000/agents/default/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What are your opening hours?","sessionId":"test-1","language":"en"}'
```

### 5. Open dashboard

```bash
pnpm --filter @axon-ai/dashboard dev
```

Visit http://localhost:3001

## Mock Mode

With `MOCK_MODE=true` (default), no API keys are required. Add keys to `.env` and set `MOCK_MODE=false` for production.

## Scaffold New Project

```bash
npx create-axon-agent my-support-bot
```
