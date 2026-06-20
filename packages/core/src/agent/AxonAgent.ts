import type { InternalMessage, LanguageCode } from '@axon-ai/adapters';
import { v4 as uuidv4 } from 'uuid';
import type { AxonConfig } from '../config/schema.js';
import { validateConfig } from '../config/schema.js';
import { EscalationEngine, isWithinBusinessHours } from './escalation.js';
import { LLMService, RAGService, retrieveAndGenerate } from './rag.js';
import { parseDocument } from '../knowledge/ingestion.js';
import { Database, EmbeddingService } from '../knowledge/vector.js';
import { MemoryStore } from '../knowledge/memory.js';
import { LanguageMiddleware } from '../middleware/language.js';

export interface AgentResponse {
  id: string;
  content: string;
  language: LanguageCode;
  escalated: boolean;
  escalationReason?: string;
  confidence: number;
  conversationId: string;
}

export interface HandleMessageOptions {
  unhelpfulRating?: boolean;
  preferredLanguage?: LanguageCode;
}

export class AxonAgent {
  private config: AxonConfig;
  private agentId: string | null = null;
  private db: Database | null = null;
  private memoryStore: MemoryStore | null = null;
  private useMemory = false;
  private languageMiddleware: LanguageMiddleware;
  private embeddingService: EmbeddingService;
  private ragService: RAGService;
  private llmService: LLMService;
  private escalationEngine: EscalationEngine;
  private mockMode: boolean;
  private questionHistory = new Map<string, string[]>();

  constructor(config: unknown, options?: { databaseUrl?: string; mockMode?: boolean }) {
    this.config = validateConfig(config);
    this.mockMode = options?.mockMode ?? process.env.MOCK_MODE === 'true' || !process.env.ANTHROPIC_API_KEY;
    const dbUrl = options?.databaseUrl ?? process.env.DATABASE_URL ?? 'postgresql://axon:axon@localhost:5432/axon';
    try {
      this.db = new Database(dbUrl);
    } catch {
      this.useMemory = true;
    }
    this.languageMiddleware = new LanguageMiddleware(
      this.config.languages,
      this.config.keys.khaya ?? process.env.KHAYA_API_KEY,
      this.mockMode,
    );
    this.embeddingService = new EmbeddingService(this.config.keys.anthropic, this.mockMode);
    this.ragService = new RAGService(this.embeddingService);
    this.llmService = new LLMService(this.config.keys.anthropic, this.mockMode);
    this.escalationEngine = new EscalationEngine();
  }

  async init(): Promise<void> {
    try {
      this.agentId = await this.db!.ensureDefaultAgent(this.config as unknown as Record<string, unknown>);
    } catch {
      this.useMemory = true;
      this.agentId = '00000000-0000-4000-a000-000000000001';
      this.memoryStore = new MemoryStore(this.agentId);
    }
    for (const source of this.config.knowledgeBase.sources) {
      try {
        await this.addDocument(source);
      } catch (err) {
        console.warn(`Failed to ingest ${source}:`, err);
      }
    }
  }

  getId(): string {
    if (!this.agentId) throw new Error('Agent not initialized. Call init() first.');
    return this.agentId;
  }

  getConfig(): AxonConfig {
    return this.config;
  }

  async updateConfig(partial: Partial<AxonConfig>): Promise<void> {
    this.config = validateConfig({ ...this.config, ...partial });
    if (this.agentId && this.db && !this.useMemory) {
      await this.db.updateAgentConfig(this.agentId, this.config as unknown as Record<string, unknown>);
    }
  }

  private getVectorStore() {
    if (this.useMemory && this.memoryStore) return this.memoryStore;
    return this.db!.vectorStore;
  }

  async addDocument(source: string, content?: Buffer): Promise<{ documentId: string; chunkCount: number }> {
    const agentId = this.getId();

    if (this.useMemory && this.memoryStore) {
      const doc = this.memoryStore.createDocument(source);
      const chunks = await parseDocument(source, content);
      const embedded = await Promise.all(
        chunks.map(async (chunk) => ({
          content: chunk.content,
          index: chunk.index,
          embedding: await this.embeddingService.embed(chunk.content),
        })),
      );
      await this.memoryStore.storeChunks(agentId, doc.id, embedded);
      return { documentId: doc.id, chunkCount: chunks.length };
    }

    const doc = await this.db!.createDocument(agentId, source);

    try {
      const chunks = await parseDocument(source, content);
      const embedded = await Promise.all(
        chunks.map(async (chunk) => ({
          content: chunk.content,
          index: chunk.index,
          embedding: await this.embeddingService.embed(chunk.content),
        })),
      );
      await this.db!.vectorStore.storeChunks(agentId, doc.id, embedded);
      return { documentId: doc.id, chunkCount: chunks.length };
    } catch (err) {
      await this.db!.pool.query(
        `UPDATE documents SET status = 'failed', error_message = $1 WHERE id = $2`,
        [err instanceof Error ? err.message : 'Unknown error', doc.id],
      );
      throw err;
    }
  }

  async listDocuments() {
    if (this.useMemory && this.memoryStore) return this.memoryStore.listDocuments();
    return this.db!.listDocuments(this.getId());
  }

  async deleteDocument(documentId: string) {
    if (this.useMemory && this.memoryStore) {
      this.memoryStore.deleteDocument(documentId);
      return;
    }
    await this.db!.deleteDocument(documentId);
  }

  async getAnalytics() {
    if (this.useMemory) {
      return { conversationVolume: 0, escalationRate: 0, resolutionRate: 1, languageDistribution: [], escalationCount: 0 };
    }
    return this.db!.getAnalytics(this.getId());
  }

  getDatabase(): Database | null {
    return this.db;
  }

  getLanguageMiddleware(): LanguageMiddleware {
    return this.languageMiddleware;
  }

  async handleMessage(
    msg: InternalMessage,
    options: HandleMessageOptions = {},
  ): Promise<AgentResponse> {
    const agentId = this.getId();
    const language =
      options.preferredLanguage ??
      msg.language ??
      (await this.languageMiddleware.detectLanguage(msg.content));

    const conversation = this.useMemory
      ? { id: `mem-conv-${msg.sessionId}` }
      : await this.db!.getOrCreateConversation(agentId, msg.channel, msg.sessionId, language);

    if (!this.useMemory) {
      await this.db!.addMessage(conversation.id, 'user', msg.content, { language });
      await this.db!.trackEvent(agentId, 'message_received', msg.channel, language);
    }

    const hours = this.config.escalation.businessHours;
    if (hours && !isWithinBusinessHours(hours)) {
      const offHoursMsg =
        hours.offHoursMessage ??
        'Thank you for contacting us. We are currently outside business hours. We will respond when we reopen.';
      const translated = await this.languageMiddleware.fromEnglish(offHoursMsg, language);
      await this.db!.addMessage(conversation.id, 'assistant', translated);
      return {
        id: uuidv4(),
        content: translated,
        language,
        escalated: false,
        confidence: 1,
        conversationId: conversation.id,
      };
    }

    const englishQuery = await this.languageMiddleware.toEnglish(msg.content, language);
    const sessionKey = `${msg.sessionId}:${language}`;
    const previousQuestions = this.questionHistory.get(sessionKey) ?? [];

    const { response: englishResponse, ragResult } = await retrieveAndGenerate(
      this.ragService,
      this.llmService,
      this.getVectorStore(),
      this.embeddingService,
      agentId,
      englishQuery,
      this.config.business.name,
    );

    const escalation = this.escalationEngine.check({
      message: msg.content,
      language,
      confidence: ragResult.confidence,
      confidenceThreshold: this.config.escalation.confidenceThreshold ?? 0.65,
      escalationKeywords: this.languageMiddleware.getAllEscalationKeywords(),
      previousQuestions,
      unhelpfulRating: options.unhelpfulRating,
    });

    previousQuestions.push(msg.content.toLowerCase().trim());
    this.questionHistory.set(sessionKey, previousQuestions);

    let finalEnglish = englishResponse;
    let escalated = false;

    if (escalation.shouldEscalate) {
      escalated = true;
      finalEnglish = escalation.message ?? 'Connecting you with a human agent.';
      if (!this.useMemory) {
        const messages = await this.db!.getRecentMessages(conversation.id);
        const transcript = this.escalationEngine.formatTranscript(messages);
        await this.db!.createEscalation(
          conversation.id,
          agentId,
          escalation.reason ?? 'unknown',
          transcript,
          this.config.escalation.whatsapp ? 'whatsapp' : 'email',
          this.config.escalation.whatsapp ?? this.config.escalation.email,
        );
        await this.db!.trackEvent(agentId, 'escalation', msg.channel, language, {
          reason: escalation.reason,
        });
      }
    }

    const translatedResponse = await this.languageMiddleware.fromEnglish(finalEnglish, language);
    await this.db!.addMessage(conversation.id, 'assistant', translatedResponse, {
      confidence: ragResult.confidence,
      escalated,
    });

    if (!escalated && !this.useMemory) {
      await this.db!.trackEvent(agentId, 'message_resolved', msg.channel, language);
    }

    return {
      id: uuidv4(),
      content: translatedResponse,
      language,
      escalated,
      escalationReason: escalation.reason,
      confidence: ragResult.confidence,
      conversationId: conversation.id,
    };
  }
}
