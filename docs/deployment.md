# Deployment Guide

## Docker Compose (Self-Host)

```bash
docker compose up
```

Services:
- API: http://localhost:3000
- Dashboard: http://localhost:3001
- Postgres: localhost:5432

## Railway / Render

1. Connect your GitHub repo
2. Set environment variables from `.env.example`
3. Add Postgres addon (with pgvector extension)
4. Deploy `packages/core` as the API service
5. Deploy `packages/dashboard` as a separate service

## Environment Variables

See root `.env.example` for the full list.

Production checklist:
- Set `MOCK_MODE=false`
- Add `ANTHROPIC_API_KEY` and `KHAYA_API_KEY`
- Configure `DATABASE_URL` to managed Postgres
- Set `DASHBOARD_API_KEY` to a secure random value
- Configure WhatsApp and Voice API credentials

## Widget CDN

Build the widget and serve from your API:

```bash
pnpm --filter @axon-ai/widget build
```

The API serves widget files at `/widget/widget.js`.
