import { api } from '../../../../lib/api.js';
interface Faq { id: string; question: string; answer: string; category: string | null; order: number }
export default async function FaqsPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  let faqs: Faq[] = [];
  try { const d = await api.getFaqs(guildId) as { items: Faq[] }; faqs = d.items; } catch { /* empty */ }
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-zinc-100">FAQs</h1>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
        {faqs.length === 0 && <div className="p-8 text-center text-zinc-400">No FAQs yet.</div>}
        {faqs.map((f) => (
          <div key={f.id} className="px-5 py-4">
            <div className="mb-1 flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-zinc-200">{f.question}</p>
              {f.category && (
                <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{f.category}</span>
              )}
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">{f.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
