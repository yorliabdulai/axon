import { z } from 'zod';

export const LanguageCodeSchema = z.enum(['en', 'tw', 'dag', 'ga', 'ee']);

export const AxonConfigSchema = z.object({
  id: z.string().uuid().optional(),
  business: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
  }),
  knowledgeBase: z.object({
    sources: z.array(z.string()).default([]),
  }),
  languages: z.array(LanguageCodeSchema).min(1).default(['en']),
  escalation: z
    .object({
      whatsapp: z.string().optional(),
      email: z.string().email().optional(),
      confidenceThreshold: z.number().min(0).max(1).default(0.65),
      callbackMessage: z.string().optional(),
      businessHours: z
        .object({
          timezone: z.string().default('Africa/Accra'),
          start: z.string().default('08:00'),
          end: z.string().default('18:00'),
          days: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5]),
          offHoursMessage: z.string().optional(),
        })
        .optional(),
    })
    .default({}),
  keys: z
    .object({
      anthropic: z.string().optional(),
      khaya: z.string().optional(),
    })
    .default({}),
  branding: z
    .object({
      primaryColor: z.string().default('#1B4332'),
      logo: z.string().optional(),
      position: z.enum(['bottom-right', 'bottom-left']).default('bottom-right'),
      welcomeMessages: z.record(LanguageCodeSchema, z.string()).optional(),
    })
    .optional(),
  channels: z
    .object({
      web: z.boolean().default(true),
      whatsapp: z.boolean().default(true),
      voice: z.boolean().default(true),
    })
    .optional(),
});

export type AxonConfig = z.infer<typeof AxonConfigSchema>;
export type LanguageCode = z.infer<typeof LanguageCodeSchema>;

export function validateConfig(config: unknown): AxonConfig {
  return AxonConfigSchema.parse(config);
}
