import type { ChannelAdapter, InternalMessage, LanguageCode, OutboundMessage } from '@axon-ai/adapters';

export interface VoiceConfig {
  apiKey?: string;
  username?: string;
  mockMode?: boolean;
}

export interface VoiceCallbackPayload {
  sessionId?: string;
  callerNumber?: string;
  dtmfDigits?: string;
  recordingUrl?: string;
  transcription?: string;
  callSessionState?: string;
}

const LANG_MENU: Record<string, LanguageCode> = {
  '1': 'en',
  '2': 'tw',
  '3': 'dag',
  '4': 'ga',
  '5': 'ee',
};

export class VoiceAdapter implements ChannelAdapter {
  readonly channelId = 'voice';
  private config: VoiceConfig;
  private sessions = new Map<string, { language?: LanguageCode; stage: 'language' | 'query' | 'done' }>();

  constructor(config: VoiceConfig = {}) {
    this.config = { mockMode: !config.apiKey || config.mockMode, ...config };
  }

  async normalize(inbound: VoiceCallbackPayload): Promise<InternalMessage> {
    const sessionId = inbound.sessionId ?? inbound.callerNumber ?? 'unknown';
    let session = this.sessions.get(sessionId) ?? { stage: 'language' as const };

    if (inbound.dtmfDigits && session.stage === 'language') {
      session.language = LANG_MENU[inbound.dtmfDigits] ?? 'en';
      session.stage = 'query';
      this.sessions.set(sessionId, session);
    }

    if (inbound.transcription && session.stage === 'query') {
      session.stage = 'done';
      this.sessions.set(sessionId, session);
      return {
        id: crypto.randomUUID(),
        channel: this.channelId,
        sessionId,
        senderId: inbound.callerNumber,
        content: inbound.transcription,
        contentType: 'text',
        language: session.language ?? 'en',
        metadata: { recordingUrl: inbound.recordingUrl },
        timestamp: new Date(),
      };
    }

    return {
      id: crypto.randomUUID(),
      channel: this.channelId,
      sessionId,
      senderId: inbound.callerNumber,
      content: '',
      contentType: 'text',
      language: session.language ?? 'en',
      metadata: { stage: session.stage, dtmfDigits: inbound.dtmfDigits },
      timestamp: new Date(),
    };
  }

  async deliver(_outbound: OutboundMessage): Promise<void> {
    // Voice delivery is via XML response, handled by generateResponseXml
  }

  generateLanguageMenuXml(businessName: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman">Welcome to ${businessName}. Press 1 for English, 2 for Twi, 3 for Dagbani, 4 for Ga, 5 for Ewe.</Say>
  <GetDigits timeout="30" numDigits="1" finishOnKey="#">
    <Say>Please select your language.</Say>
  </GetDigits>
</Response>`;
  }

  generateRecordXml(language: LanguageCode): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman">Please state your question after the beep.</Say>
  <Record finishOnKey="#" maxLength="30" trimSilence="true" playBeep="true" />
</Response>`;
  }

  generateResponseXml(
    text: string,
    ttsLanguage: LanguageCode = 'en',
    fallbackUsed = false,
  ): string {
    const prefix = fallbackUsed ? 'Note: audio is in English. ' : '';
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman" language="${ttsLanguage}">${prefix}${this.escapeXml(text)}</Say>
</Response>`;
  }

  generateEscalationXml(callbackMessage: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman">${this.escapeXml(callbackMessage)}</Say>
</Response>`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  getSession(sessionId: string) {
    return this.sessions.get(sessionId);
  }

  resetSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }
}

export { VoiceAdapter as default };
