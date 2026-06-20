import 'dotenv/config';
import { AxonAgent } from '@axon-ai/core';

export const clinicAgent = new AxonAgent({
  business: {
    name: 'Accra Community Clinic',
    description: 'Primary healthcare clinic in Accra, Ghana',
  },
  knowledgeBase: {
    sources: ['./docs/faq.txt', './docs/services.txt'],
  },
  languages: ['en', 'tw', 'dag', 'ga', 'ee'],
  escalation: {
    whatsapp: '+233241234567',
    email: 'support@clinic.com',
    confidenceThreshold: 0.65,
  },
  keys: {
    anthropic: process.env.ANTHROPIC_API_KEY,
    khaya: process.env.KHAYA_API_KEY,
  },
  branding: {
    primaryColor: '#1B4332',
    position: 'bottom-right',
    welcomeMessages: {
      en: 'Hello! Welcome to Accra Community Clinic. How can I help?',
      tw: 'Akwaaba! Yɛ Accra Community Clinic. Mebisa me dɛn na metumi bo wo kyɛw?',
    },
  },
});

async function main() {
  await clinicAgent.init();
  console.log('Clinic agent ready:', clinicAgent.getId());
}

main().catch(console.error);
