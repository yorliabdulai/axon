# Axon

**Open-source multilingual AI customer support infrastructure for Ghana.**

Dagbani is the second most spoken language in Ghana. In 2024, it was excluded from MTN Ghana's customer service language options. Axon is the infrastructure that makes that exclusion inexcusable.

Deploy an intelligent, multilingual customer support agent in under 30 minutes — Web widget, WhatsApp, and Voice — with Dagbani, Twi, Ga, Ewe, and English supported out of the box.

## Quick Start

```bash
# Clone and install
git clone https://github.com/axon-ai/axon.git
cd axon
pnpm install

# Start local infrastructure
docker compose up -d postgres redis

# Copy env and run API
cp .env.example .env
pnpm --filter @axon-ai/core dev
```

Or scaffold a new project:

```bash
npx create-axon-agent my-support-bot
cd my-support-bot
pnpm dev
```

## Mock Mode

By default, Axon runs in **mock mode** when API keys are missing (`MOCK_MODE=true`):

| Service | Mock behavior |
|---------|---------------|
| Claude | Grounded canned replies citing retrieved chunks |
| Khaya | Passthrough English; prefixed mock translations for local languages |
| WhatsApp | In-memory log + `/mock/whatsapp/inbound` test endpoint |
| Voice | Simulated IVR at `/mock/voice/ivr` |

Add real API keys to `.env` and set `MOCK_MODE=false` — no code changes required.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MOCK_MODE` | No | `true` to use mock adapters (default) |
| `DATABASE_URL` | Yes | Postgres connection string |
| `ANTHROPIC_API_KEY` | For production | Claude API key |
| `KHAYA_API_KEY` | For local languages | Khaya/GhanaNLP API key |
| `WHATSAPP_TOKEN` | For WhatsApp | Meta Cloud API token |
| `WHATSAPP_VERIFY_TOKEN` | For WhatsApp | Webhook verification token |
| `AFRICAS_TALKING_API_KEY` | For Voice | Africa's Talking API key |

See [`.env.example`](.env.example) for the full list.

## Minimal Configuration

```typescript
import { AxonAgent } from '@axon-ai/core';

const agent = new AxonAgent({
  business: {
    name: 'Accra Community Clinic',
    description: 'Primary healthcare clinic in Accra, Ghana',
  },
  knowledgeBase: {
    sources: ['./docs/faq.pdf', './docs/services.txt'],
  },
  languages: ['en', 'tw', 'dag', 'ga', 'ee'],
  escalation: {
    whatsapp: '+233241234567',
    email: 'support@clinic.com',
  },
  keys: {
    anthropic: process.env.ANTHROPIC_API_KEY,
    khaya: process.env.KHAYA_API_KEY,
  },
});

await agent.init();
```

## Repository Structure

```
packages/core/       Core agent engine — LLM, RAG, escalation, API
packages/widget/     Embeddable vanilla JS web widget
packages/whatsapp/   WhatsApp Business API channel adapter
packages/voice/      Africa's Talking voice channel adapter
packages/dashboard/  No-code configuration dashboard (Next.js)
packages/cli/        npx create-axon-agent project scaffold
adapters/            Language and channel adapter interfaces
python/axon-ai/      Python SDK (pip install axon-ai)
examples/            Clinic, GCB Bank, SDI demos
```

## Issue #1 — Dagbani TTS

Dagbani text-to-speech is not yet available on the Khaya API. The voice channel gracefully falls back to English TTS with a Dagbani text transcript. See [`.github/ISSUE_TEMPLATE/dagbani-tts.md`](.github/ISSUE_TEMPLATE/dagbani-tts.md).

## Docker Self-Host

```bash
docker compose up
```

Runs Postgres (pgvector), Redis, API (port 3000), and Dashboard (port 3001).

## Contributing

See [docs/contributing.md](docs/contributing.md) for adapter interfaces and contribution guides.

## License

Apache 2.0 — see [LICENSE](LICENSE).
