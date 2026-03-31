'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api.js';
import { useParams } from 'next/navigation';

interface ConfigVersion { id: string; scope: string; version: number; changedBy: string; changeNote: string | null; createdAt: string }
interface VersionData { items: ConfigVersion[] }

export default function ConfigVersionsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [versions, setVersions] = useState<ConfigVersion[]>([]);
  const [rolling, setRolling] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.getConfigVersions(guildId).then((d) => setVersions((d as VersionData).items)).catch(() => void 0);
  }, [guildId]);

  const rollback = async (id: string) => {
    setRolling(id); setMsg('');
    try { await api.rollbackConfigVersion(guildId, id); setMsg('Rolled back successfully.'); }
    catch { setMsg('Rollback failed.'); }
    setRolling(null);
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-zinc-100">Config History</h1>
      {msg && <div className="mb-4 rounded-lg bg-zinc-800 p-3 text-sm text-zinc-300">{msg}</div>}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
        {versions.length === 0 && <div className="p-8 text-center text-zinc-400">No config versions yet.</div>}
        {versions.map((v) => (
          <div key={v.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <span className="text-sm font-mono text-zinc-200">{v.scope}</span>
              <span className="ml-2 text-xs text-zinc-500">v{v.version}</span>
              {v.changeNote && <span className="ml-2 text-xs text-zinc-500">{v.changeNote}</span>}
              <div className="text-xs text-zinc-500 mt-0.5">{new Date(v.createdAt).toLocaleString()}</div>
            </div>
            <button onClick={() => void rollback(v.id)} disabled={rolling === v.id} className="rounded-md bg-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-600 disabled:opacity-50">
              {rolling === v.id ? '...' : 'Rollback'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
