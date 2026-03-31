import { api } from '../../../../lib/api.js';
interface LfgPost { id: string; title: string; game: string | null; status: string; createdAt: string }
export default async function LfgPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  let posts: LfgPost[] = [];
  try { const d = await api.getLfg(guildId) as { items: LfgPost[] }; posts = d.items; } catch { /* empty */ }
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-zinc-100">LFG Posts</h1>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
        {posts.length === 0 && <div className="p-8 text-center text-zinc-400">No LFG posts yet.</div>}
        {posts.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-200">{p.title}</p>
              {p.game && <p className="text-xs text-zinc-500">{p.game}</p>}
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs ${p.status === 'open' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>{p.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
