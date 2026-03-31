import { api } from '../../../../lib/api.js';
import Link from 'next/link';

interface Rule { id: string; name: string; trigger: string; enabled: boolean; priority: number; conditions: unknown[]; actions: unknown[] }
interface RulesData { items: Rule[] }

export default async function RulesPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  let rules: Rule[] = [];
  try { const d = await api.getRules(guildId) as RulesData; rules = d.items; } catch { /* empty */ }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Rules</h1>
        <Link href={`/dashboard/${guildId}/rules/new`} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
          + New Rule
        </Link>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center">
          <p className="text-zinc-400">No rules yet.</p>
          <p className="mt-1 text-sm text-zinc-500">Rules automate actions based on triggers and conditions.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
          {rules.map((rule) => (
            <Link key={rule.id} href={`/dashboard/${guildId}/rules/${rule.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${rule.enabled ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                <div>
                  <p className="font-medium text-zinc-100">{rule.name}</p>
                  <p className="text-xs text-zinc-500">{rule.trigger} · {(rule.conditions as unknown[]).length} conditions · {(rule.actions as unknown[]).length} actions</p>
                </div>
              </div>
              <span className="text-xs text-zinc-500">priority {rule.priority}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
