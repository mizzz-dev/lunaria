import { api } from '../../../../lib/api';

interface ModerationRule { id: string; name: string; ruleType: string; enabled: boolean; action: string }
interface ModerationAction { id: string; actionType: string; targetId: string; reason: string | null; createdAt: string }

export default async function ModerationPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  let rules: ModerationRule[] = [];
  let actions: { items: ModerationAction[] } = { items: [] };
  try { rules = await api.getModerationRules(guildId) as ModerationRule[]; } catch { /* empty */ }
  try { actions = await api.getModerationActions(guildId) as { items: ModerationAction[] }; } catch { /* empty */ }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-4 text-xl font-bold text-zinc-100">Moderation Rules</h1>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
          {rules.length === 0 && <div className="p-8 text-center text-zinc-400">No moderation rules yet.</div>}
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full ${r.enabled ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                <span className="text-sm font-medium text-zinc-200">{r.name}</span>
                <span className="text-xs text-zinc-500">{r.ruleType}</span>
              </div>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{r.action}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-base font-semibold text-zinc-100">Recent Actions</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
          {actions.items.length === 0 && <div className="p-6 text-center text-zinc-400">No actions yet.</div>}
          {actions.items.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <span className="text-sm font-medium text-zinc-200">{a.actionType}</span>
                <span className="ml-2 text-xs text-zinc-500">→ {a.targetId}</span>
                {a.reason && <p className="text-xs text-zinc-500 mt-0.5">{a.reason}</p>}
              </div>
              <span className="text-xs text-zinc-500">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
