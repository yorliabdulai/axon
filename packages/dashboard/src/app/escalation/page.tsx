'use client';

import { useState } from 'react';

export default function EscalationPage() {
  const [whatsapp, setWhatsapp] = useState('+233241234567');
  const [email, setEmail] = useState('support@example.com');
  const [threshold, setThreshold] = useState(0.65);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('18:00');
  const [offHoursMessage, setOffHoursMessage] = useState(
    'Thank you for contacting us. We are currently outside business hours.',
  );
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Escalation Settings</h1>

      <form onSubmit={handleSave} className="max-w-xl space-y-6">
        <fieldset className="bg-white p-6 rounded-lg shadow space-y-4">
          <legend className="font-semibold text-lg">Contact</legend>
          <label className="block">
            <span className="text-sm text-gray-600">WhatsApp Number</span>
            <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="mt-1 w-full border rounded-lg px-4 py-2" />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full border rounded-lg px-4 py-2" />
          </label>
        </fieldset>

        <fieldset className="bg-white p-6 rounded-lg shadow space-y-4">
          <legend className="font-semibold text-lg">Confidence Threshold</legend>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full"
          />
          <p className="text-sm text-gray-600">Escalate when RAG confidence falls below: <strong>{threshold}</strong></p>
        </fieldset>

        <fieldset className="bg-white p-6 rounded-lg shadow space-y-4">
          <legend className="font-semibold text-lg">Business Hours</legend>
          <div className="flex gap-4">
            <label className="flex-1">
              <span className="text-sm text-gray-600">Start</span>
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 w-full border rounded-lg px-4 py-2" />
            </label>
            <label className="flex-1">
              <span className="text-sm text-gray-600">End</span>
              <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 w-full border rounded-lg px-4 py-2" />
            </label>
          </div>
          <label className="block">
            <span className="text-sm text-gray-600">Off-hours Message</span>
            <textarea value={offHoursMessage} onChange={(e) => setOffHoursMessage(e.target.value)} rows={3} className="mt-1 w-full border rounded-lg px-4 py-2" />
          </label>
        </fieldset>

        <button type="submit" className="bg-axon-primary text-white px-6 py-2 rounded-lg hover:bg-axon-light">
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
