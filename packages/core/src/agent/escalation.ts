export type EscalationReason =
  | 'explicit_keyword'
  | 'low_confidence'
  | 'repeat_question'
  | 'sensitive_intent'
  | 'unhelpful_rating'
  | 'voice_agent_keyword';

const SENSITIVE_PATTERNS = [
  /\b(complaint|complain|unhappy|dissatisfied|terrible|worst)\b/i,
  /\b(billing|charge|refund|payment dispute|overcharged)\b/i,
  /\b(emergency|urgent medical|heart attack|bleeding|ambulance)\b/i,
  /\b(lawyer|legal action|sue|court|lawsuit)\b/i,
];

export interface EscalationContext {
  message: string;
  language: string;
  confidence: number;
  confidenceThreshold: number;
  escalationKeywords: string[];
  previousQuestions: string[];
  unhelpfulRating?: boolean;
  voiceAgentKeyword?: boolean;
}

export interface EscalationResult {
  shouldEscalate: boolean;
  reason?: EscalationReason;
  message?: string;
}

export class EscalationEngine {
  check(ctx: EscalationContext): EscalationResult {
    const lower = ctx.message.toLowerCase();

    for (const keyword of ctx.escalationKeywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return {
          shouldEscalate: true,
          reason: 'explicit_keyword',
          message: 'Connecting you with a human agent who will follow up shortly.',
        };
      }
    }

    if (ctx.voiceAgentKeyword || /\bagent\b/i.test(lower)) {
      return {
        shouldEscalate: true,
        reason: 'voice_agent_keyword',
        message: 'A human agent will call you back within the stated time window.',
      };
    }

    if (ctx.confidence < ctx.confidenceThreshold) {
      return {
        shouldEscalate: true,
        reason: 'low_confidence',
        message: 'I want to make sure you get accurate help. Let me connect you with a team member.',
      };
    }

    const normalized = lower.trim();
    const repeatCount = ctx.previousQuestions.filter((q) => q.trim() === normalized).length;
    if (repeatCount >= 2) {
      return {
        shouldEscalate: true,
        reason: 'repeat_question',
        message: 'It seems this question needs personal attention. I am escalating to a human agent.',
      };
    }

    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(ctx.message)) {
        return {
          shouldEscalate: true,
          reason: 'sensitive_intent',
          message: 'This matter requires personal attention from our team. Connecting you now.',
        };
      }
    }

    if (ctx.unhelpfulRating) {
      return {
        shouldEscalate: true,
        reason: 'unhelpful_rating',
        message: 'Sorry that was not helpful. A human agent will assist you shortly.',
      };
    }

    return { shouldEscalate: false };
  }

  formatTranscript(messages: { role: string; content: string }[]): string {
    return messages.map((m) => `[${m.role.toUpperCase()}] ${m.content}`).join('\n');
  }
}

export function isWithinBusinessHours(
  hours?: { timezone: string; start: string; end: string; days: number[] },
): boolean {
  if (!hours) return true;
  const now = new Date();
  const day = now.getDay();
  if (!hours.days.includes(day)) return false;
  const [startH, startM] = hours.start.split(':').map(Number);
  const [endH, endM] = hours.end.split(':').map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= startH * 60 + startM && minutes <= endH * 60 + endM;
}
