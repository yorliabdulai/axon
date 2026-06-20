import Anthropic from '@anthropic-ai/sdk';
import type { RetrievedChunk } from '../knowledge/vector.js';

export interface RAGResult {
  chunks: RetrievedChunk[];
  confidence: number;
  context: string;
}

export class RAGService {
  constructor(private embeddingService: { embed(text: string): Promise<number[]> }) {}

  buildContext(chunks: RetrievedChunk[]): string {
    return chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n');
  }

  computeConfidence(chunks: RetrievedChunk[]): number {
    if (!chunks.length) return 0;
    return chunks.reduce((sum, c) => sum + c.score, 0) / chunks.length;
  }
}

export class LLMService {
  private client: Anthropic | null;
  private mockMode: boolean;

  constructor(apiKey?: string, mockMode = true) {
    this.mockMode = mockMode || !apiKey;
    this.client = this.mockMode ? null : new Anthropic({ apiKey });
  }

  async generateResponse(
    systemPrompt: string,
    userMessage: string,
    context: string,
    businessName: string,
  ): Promise<string> {
    const fullSystem = `${systemPrompt}\n\nBusiness: ${businessName}\n\nRetrieved context:\n${context}\n\nAnswer ONLY from the retrieved context. If insufficient, say you don't have that information and offer to connect to a human agent.`;

    if (this.mockMode || !this.client) {
      const snippet = context.slice(0, 300) || 'No knowledge base content available yet.';
      return `Based on our information: ${snippet.replace(/\n/g, ' ').slice(0, 200)}... How else can I help you today?`;
    }

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: fullSystem,
      messages: [{ role: 'user', content: userMessage }],
    });

    const block = response.content[0];
    return block.type === 'text' ? block.text : 'I apologize, I could not generate a response.';
  }
}

export async function retrieveAndGenerate(
  rag: RAGService,
  llm: LLMService,
  vectorStore: { search(agentId: string, embedding: number[], topK?: number): Promise<RetrievedChunk[]> },
  embeddingService: { embed(text: string): Promise<number[]> },
  agentId: string,
  query: string,
  businessName: string,
): Promise<{ response: string; ragResult: RAGResult }> {
  const embedding = await embeddingService.embed(query);
  const chunks = await vectorStore.search(agentId, embedding, 5);
  const confidence = rag.computeConfidence(chunks);
  const context = rag.buildContext(chunks);

  const response = await llm.generateResponse(
    'You are a helpful customer support agent for a Ghanaian business.',
    query,
    context,
    businessName,
  );

  return { response, ragResult: { chunks, confidence, context } };
}
