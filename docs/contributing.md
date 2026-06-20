# Contributing to Axon

Axon is structured for isolated contributions. Each extension point requires no core changes.

## Add a New Language

1. Create `adapters/languages/yourlang.ts`
2. Implement the `LanguageAdapter` interface
3. Register in `createLanguageRegistry()` in `khaya.ts`
4. Add language code to config schema

## Add a New Channel

1. Create `packages/yourchannel/`
2. Implement `ChannelAdapter` with `normalize()` and `deliver()`
3. Register webhook routes in the core server

## Add a New Document Type

1. Create a parser in `packages/core/src/knowledge/`
2. Implement `DocumentParser` interface
3. Register in the parsers array

## Improve Escalation Logic

Modify `packages/core/src/agent/escalation.ts` — no language or channel knowledge required.

## Issue #1 — Dagbani TTS

See `.github/ISSUE_TEMPLATE/dagbani-tts.md` for the Dagbani TTS contribution guide.

## Development Setup

```bash
pnpm install
docker compose up -d postgres redis
pnpm build
pnpm dev
```

## Code Style

- TypeScript strict mode
- Match existing naming and patterns
- Minimal scope per PR
