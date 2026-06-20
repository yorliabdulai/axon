export { createLanguageAdapter, getEscalationKeywords } from './base.js';
export {
  createLanguageRegistry,
  createKhayaAdapter,
  createMockAdapter,
  KhayaLanguageService,
  MockLanguageService,
} from './khaya.js';
export type {
  ChannelAdapter,
  DocumentParser,
  InternalMessage,
  LanguageAdapter,
  LanguageCode,
  OutboundMessage,
  ParsedDocument,
  SynthesisResult,
  TextChunk,
  TranscriptionResult,
} from './types.js';

// Per-language re-exports
export { getEscalationKeywords as getEnglishEscalationKeywords } from './base.js';
