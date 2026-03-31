import { api } from '../../../../lib/api.js';
interface Team { id: string; name: string; members: { userId: string }[] }
interface TeamSplit { id: string; name: string; teams: Team[]; createdAt: string }
export default async function TeamSplitsPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  let splits: TeamSplit[] = [];
  try { const d = await api.getTeamSplits(guildId) as { items: TeamSplit[] }; splits = d.items; } catch { /* empty */ }
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-zinc-100">Team Splits</h1>
      <div className="space-y-4">
        {splits.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-400">No team splits yet.</div>
        )}
        {splits.map((s) => (
          <div key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium text-zinc-200">{s.name}</p>
              <span className="text-xs text-zinc-500">{new Date(s.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {s.teams.map((t) => (
                <div key={t.id} className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
                  <p className="mb-1 text-xs font-semibold text-zinc-300">{t.name}</p>
                  <p className="text-xs text-zinc-500">{t.members.length} member{t.members.length !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
