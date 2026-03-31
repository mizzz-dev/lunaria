import { api } from '../../../../lib/api.js';

interface Quote { id: string; content: string; author: string; tags: string[]; createdAt: string }
interface QuoteData { items: Quote[]; total: number }

export default async function QuotesPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  let data: QuoteData = { items: [], total: 0 };
  try { data = await api.getQuotes(guildId, 'pageSize=50') as QuoteData; } catch { /* empty */ }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Quotes</h1>
        <span className="text-sm text-zinc-500">{data.total} quotes</span>
      </div>
      <div className="space-y-3">
        {data.items.length === 0 && <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-400">No quotes yet.</div>}
        {data.items.map((q) => (
          <div key={q.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-zinc-200 italic">"{q.content}"</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-zinc-400">— {q.author}</span>
              <div className="flex gap-1">
                {q.tags.map((t) => <span key={t} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">{t}</span>)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
