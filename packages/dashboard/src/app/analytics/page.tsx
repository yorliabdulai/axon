import { getAnalytics } from '@/lib/api';

const AGENT_ID = 'default';

const LANG_NAMES: Record<string, string> = {
  en: 'English', tw: 'Twi', dag: 'Dagbani', ga: 'Ga', ee: 'Ewe',
};

export default async function AnalyticsPage() {
  let analytics = {
    conversationVolume: 0,
    escalationRate: 0,
    resolutionRate: 0,
    escalationCount: 0,
    languageDistribution: [] as { language: string; count: number }[],
  };

  try {
    analytics = await getAnalytics(AGENT_ID);
  } catch {
    // API may be unavailable
  }

  const maxCount = Math.max(...analytics.languageDistribution.map((l) => l.count), 1);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricCard title="Total Conversations" value={analytics.conversationVolume} />
        <MetricCard title="Escalation Rate" value={`${(analytics.escalationRate * 100).toFixed(1)}%`} />
        <MetricCard title="Resolution Rate" value={`${(analytics.resolutionRate * 100).toFixed(1)}%`} />
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Language Distribution</h2>
        {analytics.languageDistribution.length === 0 ? (
          <p className="text-gray-500">No conversation data yet.</p>
        ) : (
          <div className="space-y-3">
            {analytics.languageDistribution.map((item) => (
              <div key={item.language}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{LANG_NAMES[item.language] ?? item.language}</span>
                  <span>{item.count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div
                    className="h-2 bg-axon-primary rounded-full"
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-axon-primary mt-1">{value}</p>
    </div>
  );
}
