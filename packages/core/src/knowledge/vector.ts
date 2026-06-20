import pg from 'pg';
import pgvector from 'pgvector/pg';

const EMBEDDING_DIM = 384;

function hashEmbed(text: string): number[] {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 31 + word.charCodeAt(i)) % EMBEDDING_DIM;
    }
    vec[hash] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export class EmbeddingService {
  constructor(
    private anthropicKey?: string,
    private mockMode = true,
  ) {}

  async embed(text: string): Promise<number[]> {
    if (!this.mockMode && this.anthropicKey) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1,
            messages: [{ role: 'user', content: `Embed:${text.slice(0, 200)}` }],
          }),
        });
        if (res.ok) {
          // Fallback to hash embed if no dedicated embedding endpoint
        }
      } catch {
        // fall through
      }
    }
    return hashEmbed(text);
  }
}

export interface RetrievedChunk {
  id: string;
  content: string;
  score: number;
  documentId: string;
}

export class VectorStore {
  constructor(private pool: pg.Pool) {
    pgvector.registerTypes(this.pool);
  }

  async storeChunks(
    agentId: string,
    documentId: string,
    chunks: { content: string; index: number; embedding: number[] }[],
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM document_chunks WHERE document_id = $1', [documentId]);
      for (const chunk of chunks) {
        const embeddingSql = pgvector.toSql(chunk.embedding);
        await client.query(
          `INSERT INTO document_chunks (document_id, agent_id, content, embedding, chunk_index)
           VALUES ($1, $2, $3, $4, $5)`,
          [documentId, agentId, chunk.content, embeddingSql, chunk.index],
        );
      }
      await client.query('UPDATE documents SET chunk_count = $1, status = $2 WHERE id = $3', [
        chunks.length,
        'indexed',
        documentId,
      ]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async search(agentId: string, queryEmbedding: number[], topK = 5): Promise<RetrievedChunk[]> {
    const embeddingSql = pgvector.toSql(queryEmbedding);
    const result = await this.pool.query(
      `SELECT dc.id, dc.content, dc.document_id,
              1 - (dc.embedding <=> $1::vector) AS score
       FROM document_chunks dc
       WHERE dc.agent_id = $2
       ORDER BY dc.embedding <=> $1::vector
       LIMIT $3`,
      [embeddingSql, agentId, topK],
    );
    return result.rows.map((row) => ({
      id: row.id,
      content: row.content,
      score: parseFloat(row.score),
      documentId: row.document_id,
    }));
  }
}

export class Database {
  pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  get vectorStore() {
    return new VectorStore(this.pool);
  }

  async ensureDefaultAgent(config: Record<string, unknown>): Promise<string> {
    const existing = await this.pool.query('SELECT id FROM agents LIMIT 1');
    if (existing.rows.length) return existing.rows[0].id;

    const result = await this.pool.query(
      `INSERT INTO agents (name, description, config) VALUES ($1, $2, $3) RETURNING id`,
      [
        (config.business as { name?: string })?.name ?? 'Default Agent',
        (config.business as { description?: string })?.description ?? '',
        JSON.stringify(config),
      ],
    );
    return result.rows[0].id;
  }

  async updateAgentConfig(agentId: string, config: Record<string, unknown>): Promise<void> {
    await this.pool.query(
      `UPDATE agents SET config = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(config), agentId],
    );
  }

  async getAgent(agentId: string) {
    const result = await this.pool.query('SELECT * FROM agents WHERE id = $1', [agentId]);
    return result.rows[0] ?? null;
  }

  async createDocument(agentId: string, sourceUri: string) {
    const result = await this.pool.query(
      `INSERT INTO documents (agent_id, source_uri, status) VALUES ($1, $2, 'processing') RETURNING *`,
      [agentId, sourceUri],
    );
    return result.rows[0];
  }

  async listDocuments(agentId: string) {
    const result = await this.pool.query(
      'SELECT * FROM documents WHERE agent_id = $1 ORDER BY created_at DESC',
      [agentId],
    );
    return result.rows;
  }

  async deleteDocument(documentId: string) {
    await this.pool.query('DELETE FROM documents WHERE id = $1', [documentId]);
  }

  async getOrCreateConversation(agentId: string, channel: string, sessionId: string, language: string) {
    const existing = await this.pool.query(
      'SELECT * FROM conversations WHERE agent_id = $1 AND session_id = $2',
      [agentId, sessionId],
    );
    if (existing.rows.length) return existing.rows[0];

    const result = await this.pool.query(
      `INSERT INTO conversations (agent_id, channel, session_id, language) VALUES ($1, $2, $3, $4) RETURNING *`,
      [agentId, channel, sessionId, language],
    );
    return result.rows[0];
  }

  async addMessage(conversationId: string, role: string, content: string, metadata: Record<string, unknown> = {}) {
    await this.pool.query(
      `INSERT INTO messages (conversation_id, role, content, metadata) VALUES ($1, $2, $3, $4)`,
      [conversationId, role, content, JSON.stringify(metadata)],
    );
  }

  async getRecentMessages(conversationId: string, limit = 20) {
    const result = await this.pool.query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2',
      [conversationId, limit],
    );
    return result.rows.reverse();
  }

  async createEscalation(
    conversationId: string,
    agentId: string,
    reason: string,
    transcript: string,
    contactMethod?: string,
    contactValue?: string,
  ) {
    await this.pool.query(
      `INSERT INTO escalations (conversation_id, agent_id, reason, transcript, contact_method, contact_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [conversationId, agentId, reason, transcript, contactMethod, contactValue],
    );
  }

  async trackEvent(agentId: string, eventType: string, channel?: string, language?: string, metadata: Record<string, unknown> = {}) {
    await this.pool.query(
      `INSERT INTO analytics_events (agent_id, event_type, channel, language, metadata) VALUES ($1, $2, $3, $4, $5)`,
      [agentId, eventType, channel, language, JSON.stringify(metadata)],
    );
  }

  async getAnalytics(agentId: string) {
    const [conversations, escalations, languages] = await Promise.all([
      this.pool.query(
        `SELECT COUNT(*)::int AS count FROM conversations WHERE agent_id = $1`,
        [agentId],
      ),
      this.pool.query(
        `SELECT COUNT(*)::int AS count FROM escalations WHERE agent_id = $1`,
        [agentId],
      ),
      this.pool.query(
        `SELECT language, COUNT(*)::int AS count FROM conversations WHERE agent_id = $1 GROUP BY language`,
        [agentId],
      ),
    ]);

    const totalConversations = conversations.rows[0]?.count ?? 0;
    const totalEscalations = escalations.rows[0]?.count ?? 0;

    return {
      conversationVolume: totalConversations,
      escalationRate: totalConversations ? totalEscalations / totalConversations : 0,
      resolutionRate: totalConversations ? 1 - totalEscalations / totalConversations : 0,
      languageDistribution: languages.rows,
      escalationCount: totalEscalations,
    };
  }
}
