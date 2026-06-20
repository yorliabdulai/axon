---
name: Dagbani TTS Support
about: Contribute Dagbani text-to-speech for the Axon voice channel
title: '[Issue #1] Dagbani TTS — Voice channel fallback until Khaya API support'
labels: enhancement, language, good first issue
assignees: ''
---

## Background

Dagbani is Ghana's second most spoken language and the origin story of Axon. Khaya API currently supports Dagbani ASR and text translation, but **TTS is not yet available**.

## Current Behavior

When a Dagbani-speaking caller uses the voice channel:
- ASR transcribes Dagbani speech via Khaya
- Agent generates a Dagbani text response
- **TTS falls back to English audio** with Dagbani text sent via SMS/WhatsApp transcript

## What's Needed

1. Khaya API Dagbani TTS endpoint integration (when available)
2. Or: community-contributed Dagbani TTS model compatible with our `LanguageAdapter.synthesize()` interface

## How to Contribute

Implement `synthesize()` in `adapters/languages/dagbani.ts` following the `LanguageAdapter` interface in `adapters/languages/types.ts`.

No core engine changes required.

## References

- [Khaya API / GhanaNLP](https://ghananlp.org/)
- Axon PRD Section 6.2 — Known Gap
