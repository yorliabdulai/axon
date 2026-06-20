import type { LanguageAdapter, LanguageCode } from '@axon-ai/adapters';
import { createLanguageRegistry } from '@axon-ai/adapters';

export class LanguageMiddleware {
  private registry: Map<LanguageCode, LanguageAdapter>;
  private enabledLanguages: LanguageCode[];

  constructor(
    enabledLanguages: LanguageCode[],
    khayaKey?: string,
    mockMode = true,
  ) {
    this.enabledLanguages = enabledLanguages;
    this.registry = createLanguageRegistry(khayaKey, mockMode);
  }

  async detectLanguage(text: string): Promise<LanguageCode> {
    for (const code of this.enabledLanguages) {
      const adapter = this.registry.get(code);
      if (!adapter) continue;
      const detected = await adapter.detect(text);
      if (this.enabledLanguages.includes(detected)) return detected;
    }
    return this.enabledLanguages.includes('en') ? 'en' : this.enabledLanguages[0];
  }

  async toEnglish(text: string, from: LanguageCode): Promise<string> {
    if (from === 'en') return text;
    const adapter = this.registry.get(from);
    if (!adapter) return text;
    return adapter.translateToEnglish(text, from);
  }

  async fromEnglish(text: string, to: LanguageCode): Promise<string> {
    if (to === 'en') return text;
    const adapter = this.registry.get(to);
    if (!adapter) return text;
    return adapter.translateFromEnglish(text, to);
  }

  getAllEscalationKeywords(): string[] {
    const keywords: string[] = [];
    for (const code of this.enabledLanguages) {
      const adapter = this.registry.get(code);
      if (adapter) keywords.push(...adapter.getEscalationKeywords());
    }
    return keywords;
  }

  getAdapter(code: LanguageCode): LanguageAdapter | undefined {
    return this.registry.get(code);
  }
}
