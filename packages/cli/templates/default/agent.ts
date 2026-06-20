import 'dotenv/config';
import { AxonAgent } from '@axon-ai/core';

const agent = new AxonAgent({
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
  },
  keys: {
    anthropic: process.env.ANTHROPIC_API_KEY,
    khaya: process.env.KHAYA_API_KEY,
  },
});

async function main() {
  await agent.init();
  console.log('Agent ready:', agent.getId());
}

main().catch(console.error);
