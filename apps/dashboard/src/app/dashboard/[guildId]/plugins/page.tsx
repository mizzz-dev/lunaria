import { api } from '../../../../lib/api.js';
import Link from 'next/link';

export default async function PluginsPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  let plugins: Array<{ pluginKey: string; name: string; description: string; enabled: boolean; billingTier: string; isStub: boolean }> = [];
  try { plugins = await api.getPlugins(guildId); } catch { /* empty */ }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-zinc-100">Plugins</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plugins.map((p) => (
          <Link key={p.pluginKey} href={`/dashboard/${guildId}/plugins/${p.pluginKey}`} className="block rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-100">{p.name}</span>
              <div className="flex items-center gap-2">
                {p.isStub && <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">stub</span>}
                <span className={`inline-block h-2 w-2 rounded-full ${p.enabled ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              </div>
            </div>
            <p className="text-sm text-zinc-400 line-clamp-2">{p.description}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs ${p.billingTier === 'free' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-amber-900/40 text-amber-400'}`}>{p.billingTier}</span>
              <span className={`text-xs ${p.enabled ? 'text-emerald-400' : 'text-zinc-500'}`}>{p.enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
