import type { RetrievedChunk } from './vector.js';

export class MemoryStore {
  private chunks: Map<string, { content: string; embedding: number[]; documentId: string; index: number }[]> = new Map();
  private agentId: string;
  private documents: Map<string, { id: string; source_uri: string; status: string; chunk_count: number }> = new Map();
  private docCounter = 0;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  async storeChunks(
    _agentId: string,
    documentId: string,
    chunks: { content: string; index: number; embedding: number[] }[],
  ): Promise<void> {
    this.chunks.set(documentId, chunks.map((c) => ({ ...c, documentId })));
    const doc = this.documents.get(documentId);
    if (doc) {
      doc.status = 'indexed';
      doc.chunk_count = chunks.length;
    }
  }

  async search(_agentId: string, queryEmbedding: number[], topK = 5): Promise<RetrievedChunk[]> {
    const allChunks: RetrievedChunk[] = [];
    for (const [documentId, chunks] of this.chunks) {
      for (const chunk of chunks) {
        const score = cosineSimilarity(queryEmbedding, chunk.embedding);
        allChunks.push({
          id: `${documentId}-${chunk.index}`,
          content: chunk.content,
          score,
          documentId,
        });
      }
    }
    return allChunks.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  createDocument(sourceUri: string) {
    const id = `mem-doc-${++this.docCounter}`;
    const doc = { id, source_uri: sourceUri, status: 'processing', chunk_count: 0 };
    this.documents.set(id, doc);
    return doc;
  }

  listDocuments() {
    return Array.from(this.documents.values());
  }

  deleteDocument(id: string) {
    this.documents.delete(id);
    this.chunks.delete(id);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}
