'use client';

import { useMemo, useState } from 'react';
import { api } from '../lib/api';

interface DashboardData {
  memberCount: number;
  enabledPlugins: number;
  ruleCount: number;
  recentAuditLogs: unknown[];
}

interface LayoutState {
  order: string[];
  hidden: string[];
  updatedAt: string;
}

const widgetRenderers: Record<string, (data: DashboardData | null) => { label: string; value: string | number; icon: string; sub?: string }> = {
  members: (data) => ({ label: 'Members', value: data?.memberCount ?? '—', icon: '👥' }),
  plugins: (data) => ({ label: 'Active Plugins', value: data?.enabledPlugins ?? '—', icon: '🧩' }),
  rules: (data) => ({ label: 'Active Rules', value: data?.ruleCount ?? '—', icon: '⚡' }),
  audit: (data) => ({ label: 'Audit Events', value: data?.recentAuditLogs.length ?? '—', icon: '📋', sub: '(last 10)' }),
};

function swapItems(items: string[], from: string, to: string): string[] {
  const next = [...items];
  const fromIndex = next.indexOf(from);
  const toIndex = next.indexOf(to);
  if (fromIndex < 0 || toIndex < 0) return next;
  const fromValue = next[fromIndex];
  const toValue = next[toIndex];
  if (!fromValue || !toValue) return next;
  next[fromIndex] = toValue;
  next[toIndex] = fromValue;
  return next;
}

export function DashboardTopEditor({ guildId, initialData, initialLayout, visibleWidgets }: { guildId: string; initialData: DashboardData | null; initialLayout: LayoutState; visibleWidgets: string[] }) {
  const [editing, setEditing] = useState(false);
  const [layout, setLayout] = useState<LayoutState>(initialLayout);

  const activeWidgets = useMemo(() => layout.order.filter((key) => visibleWidgets.includes(key) && !layout.hidden.includes(key)), [layout, visibleWidgets]);

  const save = async () => {
    const next = { ...layout, updatedAt: new Date().toISOString() };
    await api.updateDashboardLayout(guildId, next);
    setLayout(next);
    setEditing(false);
  };

  const reset = async () => {
    const next = await api.resetDashboardLayout(guildId) as LayoutState;
    setLayout(next);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Overview</h1>
        <div className="flex gap-2">
          <button className="rounded-md border border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-800" onClick={() => setEditing((v) => !v)}>{editing ? 'Cancel' : 'Edit layout'}</button>
          {editing && <>
            <button className="rounded-md border border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-800" onClick={() => void reset()}>Reset</button>
            <button className="rounded-md border border-indigo-500 bg-indigo-600 px-3 py-1 text-sm" onClick={() => void save()}>Save</button>
          </>}
        </div>
      </div>

      {editing && (
        <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">
          {layout.order.map((widget) => (
            <label key={widget} className="mr-4 inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={!layout.hidden.includes(widget)}
                onChange={(e) => {
                  setLayout((prev) => ({
                    ...prev,
                    hidden: e.target.checked ? prev.hidden.filter((h) => h !== widget) : [...prev.hidden, widget],
                  }));
                }}
              />
              {widget}
            </label>
          ))}
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {activeWidgets.map((widget) => {
          const stat = widgetRenderers[widget]?.(initialData);
          if (!stat) return null;
          return (
            <div
              key={widget}
              draggable={editing}
              onDragStart={(e) => e.dataTransfer.setData('text/widget', widget)}
              onDragOver={(e) => editing && e.preventDefault()}
              onDrop={(e) => {
                if (!editing) return;
                e.preventDefault();
                const from = e.dataTransfer.getData('text/widget');
                setLayout((prev) => ({ ...prev, order: swapItems(prev.order, from, widget) }));
              }}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <div className="mb-2 text-2xl">{stat.icon}</div>
              <div className="text-2xl font-bold text-zinc-100">{stat.value as string | number}</div>
              <div className="text-sm text-zinc-400">{stat.label}{stat.sub ? ` ${stat.sub}` : ''}</div>
            </div>
          );
        })}
      </div>

      {initialData?.recentAuditLogs && initialData.recentAuditLogs.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-base font-semibold text-zinc-100">Recent Activity</h2>
          <div className="space-y-2">
            {(initialData.recentAuditLogs as Array<{ id: string; action: string; createdAt: string; actorId: string | null }>).map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2 text-sm">
                <span className="font-mono text-zinc-300">{log.action}</span>
                <span className="text-xs text-zinc-500">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
