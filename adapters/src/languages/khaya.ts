import type { LanguageAdapter, LanguageCode, SynthesisResult, TranscriptionResult } from './types.js';
import { createLanguageAdapter } from './base.js';

const LANG_PATTERNS: Record<LanguageCode, RegExp[]> = {
  en: [/^(hello|hi|please|thank|what|how|when|where|help)/i],
  tw: [/^(maakye|medaase|ɛte sɛn|wo ho te sɛn|me pɛ)/i],
  dag: [/^(salam|n-naa|bo shɛŋa|mi ni|a niŋ)/i],
  ga: [/^(ojekoo|miishwe|ni ba|ni fee)/i],
  ee: [/^(woezɔ|akpe|nukae|ele|medo)/i],
};

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 500));
    }
  }
  throw lastError;
}

export class KhayaLanguageService {
  constructor(
    private apiKey: string,
    private baseUrl = 'https://api.ghananlp.org/v1',
  ) {}

  private async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Khaya API error: ${res.status}`);
    return res.json() as Promise<T>;
  }

  async translate(text: string, from: LanguageCode, to: LanguageCode): Promise<string> {
    if (from === to) return text;
    const result = await withRetry(() =>
      this.request<{ translation: string }>('/translate', { text, from, to }),
    );
    return result.translation;
  }

  async transcribe(audio: Buffer, language: LanguageCode): Promise<TranscriptionResult> {
    const result = await withRetry(() =>
      this.request<{ text: string; confidence?: number }>('/asr', {
        audio: audio.toString('base64'),
        language,
      }),
    );
    return { text: result.text, language, confidence: result.confidence };
  }

  async synthesize(text: string, language: LanguageCode): Promise<SynthesisResult> {
    if (language === 'dag') {
      return {
        textTranscript: text,
        ttsLanguage: 'en',
        fallbackUsed: true,
        audioBase64: undefined,
      };
    }
    const result = await withRetry(() =>
      this.request<{ audio: string }>('/tts', { text, language }),
    );
    return {
      audioBase64: result.audio,
      textTranscript: text,
      ttsLanguage: language,
    };
  }
}

export class MockLanguageService {
  async translate(text: string, from: LanguageCode, to: LanguageCode): Promise<string> {
    if (from === to) return text;
    if (to === 'en') return `[translated from ${from}] ${text}`;
    return `[${to} mock] ${text}`;
  }

  async transcribe(_audio: Buffer, language: LanguageCode): Promise<TranscriptionResult> {
    return { text: '[mock transcription]', language, confidence: 0.9 };
  }

  async synthesize(text: string, language: LanguageCode): Promise<SynthesisResult> {
    if (language === 'dag') {
      return { textTranscript: text, ttsLanguage: 'en', fallbackUsed: true };
    }
    return { textTranscript: text, ttsLanguage: language, audioBase64: 'mock-audio' };
  }
}

export function createKhayaAdapter(code: LanguageCode, name: string, khaya: KhayaLanguageService): LanguageAdapter {
  return createLanguageAdapter(code, name, {
    async detect(text) {
      for (const [lang, patterns] of Object.entries(LANG_PATTERNS) as [LanguageCode, RegExp[]][]) {
        if (patterns.some((p) => p.test(text.trim()))) return lang;
      }
      return code;
    },
    async translateToEnglish(text, from = code) {
      if (from === 'en') return text;
      try {
        return await khaya.translate(text, from, 'en');
      } catch {
        return text;
      }
    },
    async translateFromEnglish(text, to) {
      if (to === 'en') return text;
      try {
        return await khaya.translate(text, 'en', to);
      } catch {
        return text;
      }
    },
    async transcribe(audio, language = code) {
      const buf = typeof audio === 'string' ? Buffer.from(audio, 'base64') : audio;
      return khaya.transcribe(buf, language);
    },
    async synthesize(text, language = code) {
      return khaya.synthesize(text, language);
    },
  });
}

export function createMockAdapter(code: LanguageCode, name: string, mock: MockLanguageService): LanguageAdapter {
  return createLanguageAdapter(code, name, {
    async detect(text) {
      for (const [lang, patterns] of Object.entries(LANG_PATTERNS) as [LanguageCode, RegExp[]][]) {
        if (patterns.some((p) => p.test(text.trim()))) return lang;
      }
      return 'en';
    },
    async translateToEnglish(text, from = code) {
      return mock.translate(text, from, 'en');
    },
    async translateFromEnglish(text, to) {
      return mock.translate(text, 'en', to);
    },
    async transcribe(audio, language = code) {
      const buf = typeof audio === 'string' ? Buffer.from(audio, 'base64') : audio;
      return mock.transcribe(buf, language);
    },
    async synthesize(text, language = code) {
      return mock.synthesize(text, language);
    },
  });
}

export function createLanguageRegistry(apiKey?: string, mockMode = true): Map<LanguageCode, LanguageAdapter> {
  const registry = new Map<LanguageCode, LanguageAdapter>();
  const languages: [LanguageCode, string][] = [
    ['en', 'English'],
    ['tw', 'Twi'],
    ['dag', 'Dagbani'],
    ['ga', 'Ga'],
    ['ee', 'Ewe'],
  ];

  const useMock = mockMode || !apiKey;
  const khaya = useMock ? null : new KhayaLanguageService(apiKey!);
  const mock = new MockLanguageService();

  for (const [code, name] of languages) {
    registry.set(
      code,
      useMock ? createMockAdapter(code, name, mock) : createKhayaAdapter(code, name, khaya!),
    );
  }
  return registry;
}
