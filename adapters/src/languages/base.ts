import type { LanguageAdapter, LanguageCode } from './types.js';

const ESCALATION_KEYWORDS: Record<LanguageCode, string[]> = {
  en: ['speak to a person', 'human agent', 'talk to someone', 'real person', 'agent please'],
  tw: ['ka me ne obi', 'nnipa', 'obibini', 'kasa ne obi'],
  dag: ['ninvuɣ\' shɛba', 'binnam', 'n-zaŋ shɛli'],
  ga: ['kɛ mi ni obi', 'adamfo', 'nii'],
  ee: ['gblẽm nye ame', 'ame', 'gblẽm nye'],
};

export function getEscalationKeywords(code: LanguageCode): string[] {
  return ESCALATION_KEYWORDS[code] ?? ESCALATION_KEYWORDS.en;
}

export function createLanguageAdapter(
  code: LanguageCode,
  name: string,
  impl: Omit<LanguageAdapter, 'code' | 'name' | 'getEscalationKeywords'>,
): LanguageAdapter {
  return {
    code,
    name,
    getEscalationKeywords: () => getEscalationKeywords(code),
    ...impl,
  };
}
