'use client';

import { useState } from 'react';

const LANGUAGES = [
  { code: 'en', name: 'English', channels: ['web', 'whatsapp', 'voice'] },
  { code: 'tw', name: 'Twi', channels: ['web', 'whatsapp', 'voice'] },
  { code: 'dag', name: 'Dagbani', channels: ['web', 'whatsapp', 'voice'] },
  { code: 'ga', name: 'Ga', channels: ['web', 'whatsapp', 'voice'] },
  { code: 'ee', name: 'Ewe', channels: ['web', 'whatsapp', 'voice'] },
];

const CHANNELS = ['web', 'whatsapp', 'voice'];

export default function LanguagesPage() {
  const [enabled, setEnabled] = useState<Record<string, Record<string, boolean>>>(() => {
    const init: Record<string, Record<string, boolean>> = {};
    for (const lang of LANGUAGES) {
      init[lang.code] = {};
      for (const ch of CHANNELS) init[lang.code][ch] = true;
    }
    return init;
  });

  function toggle(lang: string, channel: string) {
    setEnabled((prev) => ({
      ...prev,
      [lang]: { ...prev[lang], [channel]: !prev[lang]?.[channel] },
    }));
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Languages</h1>
      <p className="text-gray-600 mb-8">Enable or disable languages per channel.</p>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4">Language</th>
              {CHANNELS.map((ch) => (
                <th key={ch} className="text-center p-4 capitalize">{ch}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LANGUAGES.map((lang) => (
              <tr key={lang.code} className="border-t">
                <td className="p-4 font-medium">{lang.name} ({lang.code})</td>
                {CHANNELS.map((ch) => (
                  <td key={ch} className="text-center p-4">
                    <input
                      type="checkbox"
                      checked={enabled[lang.code]?.[ch] ?? false}
                      onChange={() => toggle(lang.code, ch)}
                      className="w-4 h-4 accent-axon-primary"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {LANGUAGES.find((l) => l.code === 'dag') && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Issue #1:</strong> Dagbani TTS is not yet available. Voice channel uses English TTS with Dagbani text transcript.
          </p>
        </div>
      )}
    </div>
  );
}
