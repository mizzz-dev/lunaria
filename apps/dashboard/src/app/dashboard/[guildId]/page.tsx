import { api } from '../../../lib/api';

export default async function GuildOverviewPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  let data: { memberCount: number; enabledPlugins: number; ruleCount: number; recentAuditLogs: unknown[] } | null = null;
  try { data = await api.getDashboard(guildId); } catch { /* show empty state */ }

  const stats = [
    { label: 'Members', value: data?.memberCount ?? '—', icon: '👥' },
    { label: 'Active Plugins', value: data?.enabledPlugins ?? '—', icon: '🧩' },
    { label: 'Active Rules', value: data?.ruleCount ?? '—', icon: '⚡' },
    { label: 'Audit Events', value: data?.recentAuditLogs.length ?? '—', icon: '📋', sub: '(last 10)' },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-zinc-100">Overview</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold text-zinc-100">{stat.value as string | number}</div>
            <div className="text-sm text-zinc-400">{stat.label}{stat.sub ? ` ${stat.sub}` : ''}</div>
          </div>
        ))}
      </div>

      {data?.recentAuditLogs && data.recentAuditLogs.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-base font-semibold text-zinc-100">Recent Activity</h2>
          <div className="space-y-2">
            {(data.recentAuditLogs as Array<{ id: string; action: string; createdAt: string; actorId: string | null }>).map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2 text-sm">
                <span className="font-mono text-zinc-300">{log.action}</span>
                <span className="text-zinc-500 text-xs">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
