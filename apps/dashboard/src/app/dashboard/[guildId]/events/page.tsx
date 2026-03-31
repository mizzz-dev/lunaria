import { api } from '../../../../lib/api.js';
interface Event { id: string; title: string; status: string; startsAt: string }
export default async function EventsPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  let events: Event[] = [];
  try { const d = await api.getEvents(guildId) as { items: Event[] }; events = d.items; } catch { /* empty */ }
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-zinc-100">Events</h1>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
        {events.length === 0 && <div className="p-8 text-center text-zinc-400">No events yet.</div>}
        {events.map((e) => (
          <div key={e.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-200">{e.title}</p>
              <p className="text-xs text-zinc-500">{new Date(e.startsAt).toLocaleString()}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs ${e.status === 'open' ? 'bg-emerald-900/40 text-emerald-400' : e.status === 'cancelled' ? 'bg-red-900/40 text-red-400' : 'bg-zinc-800 text-zinc-500'}`}>{e.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
