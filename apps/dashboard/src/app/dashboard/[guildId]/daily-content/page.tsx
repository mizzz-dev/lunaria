import { api } from '../../../../lib/api';
interface DailyContentJob { id: string; contentType: string; channelId: string; cronExpression: string; enabled: boolean; tags: string[] }
interface DailyContentRun { id: string; jobId: string; status: string; createdAt: string; error: string | null }
export default async function DailyContentPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  let jobs: DailyContentJob[] = [];
  let runs: DailyContentRun[] = [];
  try {
    const [jd, rd] = await Promise.all([
      api.getDailyContentJobs(guildId) as Promise<{ items: DailyContentJob[] }>,
      api.getDailyContentRuns(guildId) as Promise<{ items: DailyContentRun[] }>,
    ]);
    jobs = jd.items;
    runs = rd.items;
  } catch { /* empty */ }

  const statusColor = (s: string) => {
    if (s === 'success') return 'bg-emerald-900/40 text-emerald-400';
    if (s === 'error') return 'bg-red-900/40 text-red-400';
    return 'bg-zinc-800 text-zinc-500';
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-6 text-xl font-bold text-zinc-100">Daily Content</h1>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">Jobs</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
          {jobs.length === 0 && <div className="p-6 text-center text-zinc-400 text-sm">No daily content jobs configured.</div>}
          {jobs.map((j) => (
            <div key={j.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-200">{j.contentType}</p>
                <p className="text-xs text-zinc-500">
                  Channel: {j.channelId} · <span className="font-mono">{j.cronExpression}</span>
                  {j.tags.length > 0 && ` · tags: ${j.tags.join(', ')}`}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${j.enabled ? 'bg-emerald-900/40 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                {j.enabled ? 'enabled' : 'disabled'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">Recent Runs</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
          {runs.length === 0 && <div className="p-6 text-center text-zinc-400 text-sm">No runs yet.</div>}
          {runs.slice(0, 20).map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-xs font-mono text-zinc-400">{r.jobId}</p>
                {r.error && <p className="text-xs text-red-400">{r.error}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">{new Date(r.createdAt).toLocaleString()}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor(r.status)}`}>{r.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
