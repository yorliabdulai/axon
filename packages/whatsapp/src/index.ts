import type { ChannelAdapter, InternalMessage, OutboundMessage } from '@axon-ai/adapters';

export interface WhatsAppConfig {
  token?: string;
  phoneNumberId?: string;
  mockMode?: boolean;
  apiVersion?: string;
}

export interface WhatsAppWebhookPayload {
  entry?: {
    changes?: {
      value?: {
        messages?: WhatsAppInboundMessage[];
        contacts?: { profile: { name: string }; wa_id: string }[];
      };
    }[];
  }[];
}

export interface WhatsAppInboundMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'audio' | 'document' | 'image';
  text?: { body: string };
  audio?: { id: string; mime_type: string };
}

const messageLog: { inbound: unknown; outbound?: unknown }[] = [];

export class WhatsAppAdapter implements ChannelAdapter {
  readonly channelId = 'whatsapp';
  private config: WhatsAppConfig;

  constructor(config: WhatsAppConfig = {}) {
    this.config = {
      mockMode: !config.token || config.mockMode,
      apiVersion: 'v21.0',
      ...config,
    };
  }

  async normalize(inbound: WhatsAppWebhookPayload): Promise<InternalMessage[]> {
    const messages = inbound.entry?.[0]?.changes?.[0]?.value?.messages ?? [];
    return messages.map((msg) => ({
      id: msg.id,
      channel: this.channelId,
      sessionId: msg.from,
      senderId: msg.from,
      content: msg.text?.body ?? '',
      contentType: msg.type === 'audio' ? 'audio' : msg.type === 'document' ? 'document' : 'text',
      metadata: { whatsappMessageId: msg.id, audioId: msg.audio?.id },
      timestamp: new Date(parseInt(msg.timestamp) * 1000),
    }));
  }

  async deliver(outbound: OutboundMessage): Promise<void> {
    if (this.config.mockMode) {
      messageLog.push({ inbound: null, outbound });
      console.log('[WhatsApp Mock] Send to', outbound.recipientId, ':', outbound.content);
      return;
    }

    const url = `https://graph.facebook.com/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`;
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: outbound.recipientId,
        type: 'text',
        text: { body: outbound.content },
      }),
    });
  }

  async sendEscalationTranscript(
    escalationNumber: string,
    transcript: string,
    customerNumber: string,
  ): Promise<void> {
    const message = `🚨 Escalation from ${customerNumber}\n\n${transcript}`;
    await this.deliver({
      sessionId: customerNumber,
      recipientId: escalationNumber.replace(/\D/g, ''),
      content: message,
      contentType: 'text',
      language: 'en',
    });
  }

  async downloadMedia(mediaId: string): Promise<Buffer> {
    if (this.config.mockMode) {
      return Buffer.from('mock-audio-data');
    }
    const metaRes = await fetch(`https://graph.facebook.com/${this.config.apiVersion}/${mediaId}`, {
      headers: { Authorization: `Bearer ${this.config.token}` },
    });
    const meta = (await metaRes.json()) as { url: string };
    const mediaRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${this.config.token}` },
    });
    return Buffer.from(await mediaRes.arrayBuffer());
  }

  verifyWebhook(mode: string, token: string, verifyToken: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === verifyToken) return challenge;
    return null;
  }

  getMessageLog() {
    return messageLog;
  }
}

export function createMockInbound(from: string, message: string, type: 'text' | 'audio' = 'text'): WhatsAppWebhookPayload {
  return {
    entry: [{
      changes: [{
        value: {
          messages: [{
            from,
            id: crypto.randomUUID(),
            timestamp: String(Math.floor(Date.now() / 1000)),
            type,
            text: type === 'text' ? { body: message } : undefined,
            audio: type === 'audio' ? { id: 'mock-audio-id', mime_type: 'audio/ogg' } : undefined,
          }],
        },
      }],
    }],
  };
}

export { WhatsAppAdapter as default };
