'use client';

import { useEffect, useState } from 'react';

const AGENT_ID = 'default';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const API_KEY = process.env.NEXT_PUBLIC_DASHBOARD_API_KEY ?? 'dev-dashboard-key';

interface Document {
  id: string;
  source_uri: string;
  status: string;
  chunk_count: number;
  error_message?: string;
  created_at: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      const res = await fetch(`${API_URL}/agents/${AGENT_ID}/documents`, {
        headers: { 'x-api-key': API_KEY },
      });
      if (res.ok) setDocuments(await res.json());
    } catch {
      // ignore
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!source.trim()) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/agents/${AGENT_ID}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({ source: source.trim() }),
      });
      setSource('');
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`${API_URL}/agents/${AGENT_ID}/documents/${id}`, {
      method: 'DELETE',
      headers: { 'x-api-key': API_KEY },
    });
    await load();
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Documents</h1>

      <form onSubmit={handleAdd} className="flex gap-2 mb-8">
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="File path, URL, or raw:text content"
          className="flex-1 border rounded-lg px-4 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-axon-primary text-white px-6 py-2 rounded-lg hover:bg-axon-light disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Document'}
        </button>
      </form>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4">Source</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Chunks</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">No documents yet</td></tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="border-t">
                  <td className="p-4 font-mono text-sm">{doc.source_uri}</td>
                  <td className="p-4">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="p-4">{doc.chunk_count}</td>
                  <td className="p-4">
                    <button onClick={() => handleDelete(doc.id)} className="text-red-600 hover:underline text-sm">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    indexed: 'bg-green-100 text-green-800',
    processing: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-gray-100 text-gray-800',
    failed: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] ?? colors.pending}`}>
      {status}
    </span>
  );
}
