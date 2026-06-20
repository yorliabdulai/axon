import { getAnalytics, getConfig } from '@/lib/api';

const AGENT_ID = 'default';

export default async function OverviewPage() {
  let config: Record<string, unknown> = {};
  let analytics = {
    conversationVolume: 0,
    escalationRate: 0,
    resolutionRate: 0,
    escalationCount: 0,
    languageDistribution: [] as { language: string; count: number }[],
  };

  try {
    config = await getConfig(AGENT_ID);
    analytics = await getAnalytics(AGENT_ID);
  } catch {
    // API may be unavailable during setup
  }

  const business = config.business as { name?: string; description?: string } | undefined;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{business?.name ?? 'Axon Agent'}</h1>
      <p className="text-gray-600 mb-8">{business?.description ?? 'Multilingual customer support agent'}</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Conversations" value={analytics.conversationVolume} />
        <StatCard label="Escalations" value={analytics.escalationCount} />
        <StatCard label="Escalation Rate" value={`${(analytics.escalationRate * 100).toFixed(1)}%`} />
        <StatCard label="Resolution Rate" value={`${(analytics.resolutionRate * 100).toFixed(1)}%`} />
      </div>

      <div className="mt-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Quick Start</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Upload knowledge base documents</li>
          <li>Configure languages and escalation contacts</li>
          <li>Copy embed code to your website</li>
          <li>Connect WhatsApp webhook</li>
        </ol>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-axon-primary">{value}</p>
    </div>
  );
}
