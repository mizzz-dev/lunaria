'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../../../lib/api';
import { useParams, useRouter } from 'next/navigation';

export default function RuleEditorPage() {
  const { guildId, ruleId } = useParams<{ guildId: string; ruleId: string }>();
  const router = useRouter();
  const isNew = ruleId === 'new';

  const [rule, setRule] = useState({ name: '', trigger: 'messageCreate', enabled: true, conditions: '[]', actions: '[]', priority: 0 });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    api.getRule(guildId, ruleId).then((d) => {
      const r = d as { name: string; trigger: string; enabled: boolean; conditions: unknown; actions: unknown; priority: number };
      setRule({ name: r.name, trigger: r.trigger, enabled: r.enabled, conditions: JSON.stringify(r.conditions, null, 2), actions: JSON.stringify(r.actions, null, 2), priority: r.priority });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [guildId, ruleId, isNew]);

  const save = async () => {
    setSaving(true); setError('');
    try {
      const body = { ...rule, conditions: JSON.parse(rule.conditions) as unknown, actions: JSON.parse(rule.actions) as unknown };
      if (isNew) await api.createRule(guildId, body);
      else await api.updateRule(guildId, ruleId, body);
      router.push(`/dashboard/${guildId}/rules`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); }
    setSaving(false);
  };

  if (loading) return <div className="animate-pulse h-8 bg-zinc-800 rounded w-48" />;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-xl font-bold text-zinc-100">{isNew ? 'New Rule' : 'Edit Rule'}</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Name</label>
          <input value={rule.name} onChange={(e) => setRule({ ...rule, name: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none" placeholder="Rule name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Trigger</label>
          <select value={rule.trigger} onChange={(e) => setRule({ ...rule, trigger: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none">
            {['messageCreate', 'memberJoin', 'reactionAdd', 'scheduled', 'buttonClick', 'slashCommandExecuted'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Priority</label>
          <input type="number" value={rule.priority} onChange={(e) => setRule({ ...rule, priority: parseInt(e.target.value) || 0 })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Conditions (JSON array)</label>
          <textarea value={rule.conditions} onChange={(e) => setRule({ ...rule, conditions: e.target.value })} rows={6} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Actions (JSON array)</label>
          <textarea value={rule.actions} onChange={(e) => setRule({ ...rule, actions: e.target.value })} rows={6} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="enabled" checked={rule.enabled} onChange={(e) => setRule({ ...rule, enabled: e.target.checked })} className="h-4 w-4 accent-indigo-600" />
          <label htmlFor="enabled" className="text-sm text-zinc-300">Enabled</label>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button onClick={save} disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Rule'}
          </button>
          <button onClick={() => router.back()} className="rounded-lg bg-zinc-700 px-5 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-600">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
