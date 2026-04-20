'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

interface Summary {
  memberCount: number;
  messageCount: number;
  moderationCount: number;
  pollCount: number;
  eventCount: number;
  lfgCount: number;
}

export function AnalyticsLive({ guildId, initialSummary }: { guildId: string; initialSummary: Summary | null }) {
  const [summary, setSummary] = useState<Summary | null>(initialSummary);
  const [status, setStatus] = useState<'connecting' | 'live' | 'disconnected'>('connecting');

  useEffect(() => {
    const url = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/guilds/${guildId}/analytics/stream`;
    const source = new EventSource(url, { withCredentials: true });

    source.onopen = () => setStatus('live');
    source.onerror = () => setStatus('disconnected');
    source.addEventListener('summary', (event) => {
      const next = JSON.parse((event as MessageEvent).data) as Summary;
      setSummary(next);
      setStatus('live');
    });

    return () => {
      source.close();
    };
  }, [guildId]);

  const stats = useMemo(() => (summary ? [
    { label: 'Members', value: summary.memberCount, icon: '👥' },
    { label: 'Messages (30d)', value: summary.messageCount, icon: '💬' },
    { label: 'Mod Actions (30d)', value: summary.moderationCount, icon: '🛡' },
    { label: 'Polls Created (30d)', value: summary.pollCount, icon: '📊' },
    { label: 'Events Created (30d)', value: summary.eventCount, icon: '🗓' },
    { label: 'LFG Posts (30d)', value: summary.lfgCount, icon: '🎮' },
  ] : []), [summary]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Analytics</h1>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>Live: {status}</span>
          <button onClick={() => api.getAnalyticsSummary(guildId).then((s) => setSummary(s as Summary)).catch(() => null)} className="rounded-md border border-zinc-700 px-2 py-1 hover:bg-zinc-800">Refresh</button>
        </div>
      </div>

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
