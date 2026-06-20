import 'dotenv/config';
import { AxonAgent } from '@axon-ai/core';

const agent = new AxonAgent({
  business: {
    name: 'GCB Bank',
    description: 'Ghana Commercial Bank customer support',
  },
  knowledgeBase: { sources: ['./docs/banking-faq.txt'] },
  languages: ['en', 'tw', 'ga'],
  escalation: { email: 'support@gcb.com.gh' },
  keys: { anthropic: process.env.ANTHROPIC_API_KEY, khaya: process.env.KHAYA_API_KEY },
});

await agent.init();
console.log('GCB agent ready:', agent.getId());
