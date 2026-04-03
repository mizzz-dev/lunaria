import { api } from '../../../../lib/api';

interface Summary { memberCount: number; messageCount: number; moderationCount: number; pollCount: number; eventCount: number; lfgCount: number }

export default async function AnalyticsPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  let summary: Summary | null = null;
  try { summary = await api.getAnalyticsSummary(guildId) as Summary; } catch { /* empty */ }

  const stats = summary ? [
    { label: 'Members', value: summary.memberCount, icon: '👥' },
    { label: 'Messages (30d)', value: summary.messageCount, icon: '💬' },
    { label: 'Mod Actions (30d)', value: summary.moderationCount, icon: '🛡' },
    { label: 'Polls Created (30d)', value: summary.pollCount, icon: '📊' },
    { label: 'Events Created (30d)', value: summary.eventCount, icon: '🗓' },
    { label: 'LFG Posts (30d)', value: summary.lfgCount, icon: '🎮' },
  ] : [];

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-zinc-100">Analytics</h1>
      {!summary ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-400">No analytics data yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-2xl font-bold text-zinc-100">{s.value.toLocaleString()}</div>
              <div className="text-sm text-zinc-400">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
