import { api } from '../../../../lib/api.js';
interface AutoResponse { id: string; trigger: string; response: string; matchType: string; enabled: boolean }
export default async function AutoResponsesPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  let items: AutoResponse[] = [];
  try { const d = await api.getAutoResponses(guildId) as { items: AutoResponse[] }; items = d.items; } catch { /* empty */ }
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-zinc-100">Auto-Responses</h1>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
        {items.length === 0 && <div className="p-8 text-center text-zinc-400">No auto-responses configured.</div>}
        {items.map((a) => (
          <div key={a.id} className="flex items-start justify-between px-5 py-3 gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-zinc-200 font-mono">{a.trigger}</p>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500">{a.matchType}</span>
              </div>
              <p className="mt-1 text-sm text-zinc-500 truncate">{a.response}</p>
            </div>
            <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs ${a.enabled ? 'bg-emerald-900/40 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
              {a.enabled ? 'enabled' : 'disabled'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
