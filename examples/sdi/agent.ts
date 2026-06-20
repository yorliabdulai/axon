import 'dotenv/config';
import { AxonAgent } from '@axon-ai/core';

const agent = new AxonAgent({
  business: {
    name: 'SDI Academy',
    description: 'Software Development Institute - student support',
  },
  knowledgeBase: { sources: ['./docs/school-faq.txt'] },
  languages: ['en', 'tw', 'ee'],
  escalation: { email: 'admin@sdi.edu.gh' },
  keys: { anthropic: process.env.ANTHROPIC_API_KEY, khaya: process.env.KHAYA_API_KEY },
});

await agent.init();
console.log('SDI agent ready:', agent.getId());
