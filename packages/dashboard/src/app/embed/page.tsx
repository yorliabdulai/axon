'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const AGENT_ID = 'default';

export default function EmbedPage() {
  const [primaryColor, setPrimaryColor] = useState('#1B4332');
  const [position, setPosition] = useState('bottom-right');
  const [copied, setCopied] = useState<string | null>(null);

  const widgetCode = `<!-- Paste into any HTML page - no dependencies required -->
<script
  src="${API_URL}/widget/widget.js"
  data-agent-id="${AGENT_ID}"
  data-api-url="${API_URL}"
  data-primary-color="${primaryColor}"
  data-position="${position}"
  data-languages="en,tw,dag,ga,ee"
  async
></script>`;

  const webhookUrl = `${API_URL}/webhooks/whatsapp`;

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Embed Code</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-4">Widget Settings</h2>
          <div className="flex gap-4 mb-4">
            <label>
              <span className="text-sm text-gray-600">Color</span>
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="block mt-1" />
            </label>
            <label>
              <span className="text-sm text-gray-600">Position</span>
              <select value={position} onChange={(e) => setPosition(e.target.value)} className="block mt-1 border rounded px-3 py-1">
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
              </select>
            </label>
          </div>

          <div className="relative">
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">{widgetCode}</pre>
            <button
              onClick={() => copy(widgetCode, 'widget')}
              className="absolute top-2 right-2 bg-white text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-100"
            >
              {copied === 'widget' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">WhatsApp Webhook URL</h2>
          <div className="relative">
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm">{webhookUrl}</pre>
            <button
              onClick={() => copy(webhookUrl, 'webhook')}
              className="absolute top-2 right-2 bg-white text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-100"
            >
              {copied === 'webhook' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Configure this URL in your Meta WhatsApp Business Cloud API dashboard.
          </p>
        </section>
      </div>
    </div>
  );
}
