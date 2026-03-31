'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../../../lib/api.js';
import { useParams } from 'next/navigation';

interface PluginDetail { pluginKey: string; name: string; description: string; enabled: boolean; config: Record<string, unknown>; isStub?: boolean; stubNote?: string }

export default function PluginDetailPage() {
  const { guildId, pluginKey } = useParams<{ guildId: string; pluginKey: string }>();
  const [plugin, setPlugin] = useState<PluginDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getPlugin(guildId, pluginKey).then((d) => { setPlugin(d as PluginDetail); setLoading(false); }).catch(() => setLoading(false));
  }, [guildId, pluginKey]);

  if (loading) return <div className="animate-pulse h-8 bg-zinc-800 rounded w-48" />;
  if (!plugin) return <div className="text-zinc-400">Plugin not found.</div>;

  const toggle = async () => {
    setSaving(true);
    try {
      if (plugin.enabled) await api.disablePlugin(guildId, pluginKey);
      else await api.enablePlugin(guildId, pluginKey);
      setPlugin({ ...plugin, enabled: !plugin.enabled });
      setMsg(plugin.enabled ? 'Plugin disabled.' : 'Plugin enabled.');
    } catch { setMsg('Failed to update.'); }
    setSaving(false);
  };

  return (
    <div className="max-w-xl">
      <div className="mb-2 flex items-center gap-3">
        <h1 className="text-xl font-bold text-zinc-100">{plugin.name}</h1>
        {plugin.isStub && <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">stub</span>}
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${plugin.enabled ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
      </div>
      <p className="mb-6 text-sm text-zinc-400">{plugin.description}</p>
      {plugin.stubNote && <div className="mb-6 rounded-lg border border-amber-700/50 bg-amber-900/20 p-3 text-sm text-amber-300">⚠️ {plugin.stubNote}</div>}

      <button onClick={toggle} disabled={saving || !!plugin.stubNote} className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${plugin.enabled ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200' : 'bg-indigo-600 hover:bg-indigo-500 text-white'} disabled:opacity-50`}>
        {saving ? '...' : plugin.enabled ? 'Disable Plugin' : 'Enable Plugin'}
      </button>
      {msg && <p className="mt-3 text-sm text-zinc-400">{msg}</p>}
    </div>
  );
}
