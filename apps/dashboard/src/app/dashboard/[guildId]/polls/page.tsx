import { api } from '../../../../lib/api';
interface Poll { id: string; title: string; closed: boolean; voteType: string; createdAt: string }
export default async function PollsPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  let polls: Poll[] = [];
  try { const d = await api.getPolls(guildId) as { items: Poll[] }; polls = d.items; } catch { /* empty */ }
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-zinc-100">Polls</h1>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
        {polls.length === 0 && <div className="p-8 text-center text-zinc-400">No polls yet.</div>}
        {polls.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-200">{p.title}</p>
              <p className="text-xs text-zinc-500">{p.voteType} vote · {new Date(p.createdAt).toLocaleDateString()}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs ${p.closed ? 'bg-zinc-800 text-zinc-500' : 'bg-emerald-900/40 text-emerald-400'}`}>{p.closed ? 'Closed' : 'Active'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
