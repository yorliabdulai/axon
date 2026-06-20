# Configuration Reference

## Minimal Config

```typescript
{
  business: { name: string, description?: string },
  knowledgeBase: { sources: string[] },
  languages: ('en' | 'tw' | 'dag' | 'ga' | 'ee')[],
  escalation: {
    whatsapp?: string,
    email?: string,
    confidenceThreshold?: number,  // default 0.65
    businessHours?: {
      timezone: string,
      start: string,  // "08:00"
      end: string,    // "18:00"
      days: number[], // 0=Sun, 1=Mon, ...
      offHoursMessage?: string,
    },
  },
  keys: { anthropic?: string, khaya?: string },
  branding?: {
    primaryColor?: string,
    logo?: string,
    position?: 'bottom-right' | 'bottom-left',
    welcomeMessages?: Record<string, string>,
  },
}
```

## Document Sources

| Format | Example |
|--------|---------|
| Text file | `./docs/faq.txt` |
| PDF | `./docs/manual.pdf` |
| DOCX | `./docs/guide.docx` |
| CSV | `./docs/data.csv` |
| URL | `https://example.com/info` |
| Raw text | `raw:Your inline content here` |

## Language Codes

| Code | Language |
|------|----------|
| en | English |
| tw | Twi |
| dag | Dagbani |
| ga | Ga |
| ee | Ewe |
