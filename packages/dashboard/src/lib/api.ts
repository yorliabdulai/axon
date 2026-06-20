const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const API_KEY = process.env.DASHBOARD_API_KEY ?? 'dev-dashboard-key';

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...options.headers,
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getConfig(agentId: string) {
  return api<Record<string, unknown>>(`/agents/${agentId}/config`);
}

export async function updateConfig(agentId: string, config: Record<string, unknown>) {
  return api(`/agents/${agentId}/config`, { method: 'PATCH', body: JSON.stringify(config) });
}

export async function getDocuments(agentId: string) {
  return api<Record<string, unknown>[]>(`/agents/${agentId}/documents`);
}

export async function addDocument(agentId: string, source: string) {
  return api(`/agents/${agentId}/documents`, { method: 'POST', body: JSON.stringify({ source }) });
}

export async function deleteDocument(agentId: string, docId: string) {
  return api(`/agents/${agentId}/documents/${docId}`, { method: 'DELETE' });
}

export async function getAnalytics(agentId: string) {
  return api<{
    conversationVolume: number;
    escalationRate: number;
    resolutionRate: number;
    languageDistribution: { language: string; count: number }[];
    escalationCount: number;
  }>(`/agents/${agentId}/analytics`);
}

export { API_URL };
