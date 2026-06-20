export type LanguageCode = 'en' | 'tw' | 'dag' | 'ga' | 'ee';

export interface TranscriptionResult {
  text: string;
  language: LanguageCode;
  confidence?: number;
}

export interface SynthesisResult {
  audioUrl?: string;
  audioBase64?: string;
  textTranscript: string;
  ttsLanguage: LanguageCode;
  fallbackUsed?: boolean;
}

export interface LanguageAdapter {
  readonly code: LanguageCode;
  readonly name: string;
  detect(text: string): Promise<LanguageCode>;
  translateToEnglish(text: string, from?: LanguageCode): Promise<string>;
  translateFromEnglish(text: string, to: LanguageCode): Promise<string>;
  transcribe(audio: Buffer | string, language?: LanguageCode): Promise<TranscriptionResult>;
  synthesize(text: string, language?: LanguageCode): Promise<SynthesisResult>;
  getEscalationKeywords(): string[];
}

export interface InternalMessage {
  id: string;
  channel: string;
  sessionId: string;
  senderId?: string;
  content: string;
  contentType: 'text' | 'audio' | 'document' | 'image';
  language?: LanguageCode;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface OutboundMessage {
  sessionId: string;
  recipientId?: string;
  content: string;
  contentType: 'text' | 'audio';
  language: LanguageCode;
  metadata?: Record<string, unknown>;
  audioUrl?: string;
  textTranscript?: string;
}

export interface ChannelAdapter {
  readonly channelId: string;
  normalize(inbound: unknown): Promise<InternalMessage>;
  deliver(outbound: OutboundMessage): Promise<void>;
}

export interface ParsedDocument {
  text: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentParser {
  readonly supportedExtensions: string[];
  canParse(source: string): boolean;
  parse(source: string, content?: Buffer): Promise<ParsedDocument>;
}

export interface TextChunk {
  content: string;
  index: number;
  metadata?: Record<string, unknown>;
}
