#!/usr/bin/env node
import { cpSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templateDir = join(__dirname, '../templates/default');

const projectName = process.argv[2];

if (!projectName) {
  console.error('Usage: create-axon-agent <project-name>');
  process.exit(1);
}

const targetDir = join(process.cwd(), projectName);

if (existsSync(targetDir)) {
  console.error(`Directory ${projectName} already exists.`);
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });

if (existsSync(templateDir)) {
  cpSync(templateDir, targetDir, { recursive: true });
} else {
  writeFileSync(join(targetDir, 'package.json'), JSON.stringify({
    name: projectName,
    version: '1.0.0',
    type: 'module',
    scripts: { dev: 'tsx agent.ts', start: 'tsx agent.ts' },
    dependencies: { '@axon-ai/core': 'workspace:*', dotenv: '^16.4.7' },
    devDependencies: { tsx: '^4.19.2', typescript: '^5.7.2' },
  }, null, 2));

  writeFileSync(join(targetDir, 'agent.ts'), `import 'dotenv/config';
import { AxonAgent } from '@axon-ai/core';

const agent = new AxonAgent({
  business: {
    name: '${projectName}',
    description: 'Multilingual customer support agent',
  },
  knowledgeBase: {
    sources: ['./docs/faq.txt'],
  },
  languages: ['en', 'tw', 'dag', 'ga', 'ee'],
  escalation: {
    whatsapp: process.env.ESCALATION_WHATSAPP,
    email: process.env.ESCALATION_EMAIL,
  },
  keys: {
    anthropic: process.env.ANTHROPIC_API_KEY,
    khaya: process.env.KHAYA_API_KEY,
  },
});

async function main() {
  await agent.init();
  console.log('Agent ready:', agent.getId());

  const response = await agent.handleMessage({
    id: crypto.randomUUID(),
    channel: 'web',
    sessionId: 'demo-session',
    content: 'What are your opening hours?',
    contentType: 'text',
    timestamp: new Date(),
  });
  console.log('Demo response:', response.content);
}

main().catch(console.error);
`);

  writeFileSync(join(targetDir, '.env.example'), `MOCK_MODE=true
DATABASE_URL=postgresql://axon:axon@localhost:5432/axon
ANTHROPIC_API_KEY=
KHAYA_API_KEY=
`);

  mkdirSync(join(targetDir, 'docs'), { recursive: true });
  writeFileSync(join(targetDir, 'docs', 'faq.txt'), `Frequently Asked Questions

Opening Hours: Monday to Friday, 8:00 AM to 6:00 PM. Saturday 9:00 AM to 1:00 PM.

Location: Accra, Ghana.

Services: General consultation, laboratory tests, pharmacy, and emergency care.

Contact: Call +233 24 123 4567 or email support@clinic.com.
`);
}

console.log(`\n✓ Created ${projectName}\n`);
console.log('Next steps:');
console.log(`  cd ${projectName}`);
console.log('  cp .env.example .env');
console.log('  pnpm install');
console.log('  docker compose up -d postgres redis  # from axon root');
console.log('  pnpm dev\n');

try {
  execSync('pnpm install', { cwd: targetDir, stdio: 'inherit' });
} catch {
  console.log('Run pnpm install manually after cd into the project.');
}
