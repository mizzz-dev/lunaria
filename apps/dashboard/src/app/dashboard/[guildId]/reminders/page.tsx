import { api } from '../../../../lib/api.js';
interface Reminder { id: string; content: string; recurrence: string; remindAt: string; sent: boolean }
export default async function RemindersPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  let reminders: Reminder[] = [];
  try { const d = await api.getReminders(guildId) as { items: Reminder[] }; reminders = d.items; } catch { /* empty */ }
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-zinc-100">Reminders</h1>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
        {reminders.length === 0 && <div className="p-8 text-center text-zinc-400">No reminders yet.</div>}
        {reminders.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-5 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-200">{r.content}</p>
              <p className="text-xs text-zinc-500">{new Date(r.remindAt).toLocaleString()} · {r.recurrence}</p>
            </div>
            <span className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs ${r.sent ? 'bg-zinc-800 text-zinc-500' : 'bg-indigo-900/40 text-indigo-400'}`}>
              {r.sent ? 'sent' : 'pending'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
