import 'dotenv/config';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { AxonAgent } from '../agent/AxonAgent.js';
import type { AxonConfig } from '../config/schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const defaultConfig: AxonConfig = {
  business: {
    name: process.env.BUSINESS_NAME ?? 'Axon Demo Agent',
    description: process.env.BUSINESS_DESCRIPTION ?? 'Demo multilingual support agent',
  },
  knowledgeBase: {
    sources: [
      'raw:Opening Hours: Monday to Friday 8AM-6PM, Saturday 9AM-1PM. Contact: +233 24 123 4567. We support English, Twi, Dagbani, Ga, and Ewe.',
    ],
  },
  languages: ['en', 'tw', 'dag', 'ga', 'ee'],
  escalation: {
    whatsapp: process.env.ESCALATION_WHATSAPP,
    email: process.env.ESCALATION_EMAIL,
    confidenceThreshold: 0.65,
    callbackMessage: 'A team member will follow up within 24 hours.',
  },
  keys: {
    anthropic: process.env.ANTHROPIC_API_KEY,
    khaya: process.env.KHAYA_API_KEY,
  },
  branding: {
    primaryColor: '#1B4332',
    position: 'bottom-right',
  },
};

let agent: AxonAgent;

async function bootstrap() {
  agent = new AxonAgent(defaultConfig);
  try {
    await agent.init();
    console.log(`Agent initialized: ${agent.getId()}`);
  } catch (err) {
    console.warn('Agent init warning (DB may be unavailable):', err);
    // Allow server to start for health checks
  }
}

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

const widgetDist = join(__dirname, '../../../widget/dist');
if (existsSync(widgetDist)) {
  await app.register(fastifyStatic, { root: widgetDist, prefix: '/widget/' });
}

function checkApiKey(request: { headers: Record<string, string | string[] | undefined> }) {
  const key = process.env.DASHBOARD_API_KEY;
  if (!key) return true;
  const header = request.headers['x-api-key'];
  return header === key;
}

app.get('/health', async () => ({ status: 'ok', mockMode: process.env.MOCK_MODE !== 'false' }));

app.get('/agents/:id/config', async (request, reply) => {
  if (!checkApiKey(request)) return reply.status(401).send({ error: 'Unauthorized' });
  const config = agent?.getConfig();
  return {
    id: agent?.getId(),
    ...config,
    keys: undefined,
  };
});

app.patch('/agents/:id/config', async (request, reply) => {
  if (!checkApiKey(request)) return reply.status(401).send({ error: 'Unauthorized' });
  const body = request.body as Partial<AxonConfig>;
  await agent.updateConfig(body);
  return { success: true };
});

app.post('/agents/:id/chat', async (request, reply) => {
  const body = request.body as {
    message: string;
    sessionId?: string;
    language?: string;
    channel?: string;
    unhelpfulRating?: boolean;
  };

  if (!agent?.getId()) {
    return reply.status(503).send({ error: 'Agent not initialized. Start postgres or wait for init.' });
  }

  const response = await agent.handleMessage(
    {
      id: crypto.randomUUID(),
      channel: body.channel ?? 'web',
      sessionId: body.sessionId ?? crypto.randomUUID(),
      content: body.message,
      contentType: 'text',
      language: body.language as AxonConfig['languages'][number] | undefined,
      timestamp: new Date(),
    },
    { unhelpfulRating: body.unhelpfulRating, preferredLanguage: body.language as AxonConfig['languages'][number] | undefined },
  );

  return response;
});

app.get('/agents/:id/documents', async (request, reply) => {
  if (!checkApiKey(request)) return reply.status(401).send({ error: 'Unauthorized' });
  const docs = await agent.listDocuments();
  return docs;
});

app.post('/agents/:id/documents', async (request, reply) => {
  if (!checkApiKey(request)) return reply.status(401).send({ error: 'Unauthorized' });
  const body = request.body as { source?: string };
  const data = await request.file();

  if (data) {
    const buffer = await data.toBuffer();
    const source = data.filename ?? 'upload';
    const result = await agent.addDocument(source, buffer);
    return result;
  }

  if (body?.source) {
    const result = await agent.addDocument(body.source);
    return result;
  }

  return reply.status(400).send({ error: 'Provide source URL/path or file upload' });
});

app.delete('/agents/:id/documents/:docId', async (request, reply) => {
  if (!checkApiKey(request)) return reply.status(401).send({ error: 'Unauthorized' });
  const { docId } = request.params as { docId: string };
  await agent.deleteDocument(docId);
  return { success: true };
});

app.get('/agents/:id/analytics', async (request, reply) => {
  if (!checkApiKey(request)) return reply.status(401).send({ error: 'Unauthorized' });
  return agent.getAnalytics();
});

// Mock WhatsApp endpoints
const whatsappLog: unknown[] = [];

app.get('/webhooks/whatsapp', async (request, reply) => {
  const query = request.query as Record<string, string>;
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return reply.send(challenge);
  }
  return reply.status(403).send('Forbidden');
});

app.post('/webhooks/whatsapp', async (request, reply) => {
  const body = request.body as {
    entry?: { changes?: { value?: { messages?: { from: string; id: string; type: string; text?: { body: string } }[] } }[] }[];
  };

  const messages = body.entry?.[0]?.changes?.[0]?.value?.messages ?? [];
  for (const msg of messages) {
    const content = msg.text?.body ?? '[non-text message]';
    const response = await agent.handleMessage({
      id: msg.id,
      channel: 'whatsapp',
      sessionId: msg.from,
      senderId: msg.from,
      content,
      contentType: msg.type === 'audio' ? 'audio' : 'text',
      timestamp: new Date(),
    });
    whatsappLog.push({ inbound: msg, outbound: response });
  }
  return { success: true };
});

app.post('/mock/whatsapp/inbound', async (request) => {
  const body = request.body as { from: string; message: string; type?: string };
  const response = await agent.handleMessage({
    id: crypto.randomUUID(),
    channel: 'whatsapp',
    sessionId: body.from,
    senderId: body.from,
    content: body.message,
    contentType: body.type === 'audio' ? 'audio' : 'text',
    timestamp: new Date(),
  });
  whatsappLog.push({ mock: true, inbound: body, outbound: response });
  return response;
});

app.get('/mock/whatsapp/log', async () => whatsappLog);

// Mock Voice IVR
app.post('/webhooks/voice', async (request) => {
  const body = request.body as { sessionId?: string; digits?: string; speech?: string };
  const sessionId = body.sessionId ?? crypto.randomUUID();

  if (!body.digits && !body.speech) {
    return {
      xml: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Welcome to ${defaultConfig.business.name}. Press 1 for English, 2 for Twi, 3 for Dagbani, 4 for Ga, 5 for Ewe.</Say>
  <GetDigits timeout="10" callbackUrl="/webhooks/voice">
  </GetDigits>
</Response>`,
    };
  }

  const langMap: Record<string, string> = { '1': 'en', '2': 'tw', '3': 'dag', '4': 'ga', '5': 'ee' };
  const language = langMap[body.digits ?? '1'] ?? 'en';

  if (body.digits && !body.speech) {
    return {
      xml: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${language}">Please state your question after the beep.</Say>
  <Record callbackUrl="/webhooks/voice" maxLength="30" />
</Response>`,
      sessionId,
      language,
    };
  }

  const speech = body.speech ?? 'Hello';
  const response = await agent.handleMessage(
    {
      id: crypto.randomUUID(),
      channel: 'voice',
      sessionId,
      content: speech,
      contentType: 'text',
      language: language as AxonConfig['languages'][number],
      timestamp: new Date(),
    },
    { preferredLanguage: language as AxonConfig['languages'][number] },
  );

  const adapter = agent.getLanguageMiddleware().getAdapter(language as AxonConfig['languages'][number]);
  const synthesis = adapter ? await adapter.synthesize(response.content, language as AxonConfig['languages'][number]) : null;

  return {
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${synthesis?.ttsLanguage ?? 'en'}">${response.content}</Say>
</Response>`,
    response,
    synthesis,
  };
});

app.post('/mock/voice/ivr', async (request) => {
  return app.inject({ method: 'POST', url: '/webhooks/voice', payload: request.body });
});

await bootstrap();

const port = parseInt(process.env.PORT ?? '3000', 10);
const host = process.env.HOST ?? '0.0.0.0';

app.listen({ port, host }).catch((err) => {
  console.error(err);
  process.exit(1);
});

export { app, agent };
