'use client';

import { useState } from 'react';

const WELCOME_LANGS = ['en', 'tw', 'dag', 'ga', 'ee'];

export default function BrandingPage() {
  const [primaryColor, setPrimaryColor] = useState('#1B4332');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [logo, setLogo] = useState('');
  const [welcomeMessages, setWelcomeMessages] = useState<Record<string, string>>({
    en: 'Hello! How can I help you today?',
    tw: 'Akwaaba! Mebisa me dɛn na metumi bo wo kyɛw?',
    dag: 'Dasiba! Bɔ niŋ ka ti ni tooi ti ba?',
    ga: 'Ojekoo! Naa miishwe ni fee?',
    ee: 'Woezɔ! Nu ka nate wo?',
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Branding</h1>

      <div className="max-w-xl space-y-6">
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <label className="block">
            <span className="text-sm text-gray-600">Primary Color</span>
            <div className="flex gap-2 mt-1">
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-16" />
              <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 border rounded-lg px-4 py-2 font-mono" />
            </div>
          </label>

          <label className="block">
            <span className="text-sm text-gray-600">Logo URL</span>
            <input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." className="mt-1 w-full border rounded-lg px-4 py-2" />
          </label>

          <label className="block">
            <span className="text-sm text-gray-600">Widget Position</span>
            <select value={position} onChange={(e) => setPosition(e.target.value as typeof position)} className="mt-1 w-full border rounded-lg px-4 py-2">
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
          </label>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="font-semibold">Welcome Messages</h2>
          {WELCOME_LANGS.map((lang) => (
            <label key={lang} className="block">
              <span className="text-sm text-gray-600 uppercase">{lang}</span>
              <input
                value={welcomeMessages[lang] ?? ''}
                onChange={(e) => setWelcomeMessages({ ...welcomeMessages, [lang]: e.target.value })}
                className="mt-1 w-full border rounded-lg px-4 py-2"
              />
            </label>
          ))}
        </div>

        <div className="p-4 rounded-lg border-2 border-dashed" style={{ borderColor: primaryColor }}>
          <p className="text-sm text-gray-500 mb-2">Preview</p>
          <div className="inline-block px-4 py-2 rounded-full text-white text-sm" style={{ backgroundColor: primaryColor }}>
            💬 Chat
          </div>
        </div>
      </div>
    </div>
  );
}
