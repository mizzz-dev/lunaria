import { api } from '../../../../lib/api.js';

interface AuditLog { id: string; action: string; actorId: string | null; targetType: string | null; targetId: string | null; createdAt: string }
interface AuditData { items: AuditLog[]; total: number }

export default async function AuditLogsPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  let data: AuditData = { items: [], total: 0 };
  try { data = await api.getAuditLogs(guildId, 'pageSize=50') as AuditData; } catch { /* empty */ }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Audit Logs</h1>
        <span className="text-sm text-zinc-500">{data.total} total entries</span>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
        {data.items.length === 0 && <div className="p-8 text-center text-zinc-400">No audit logs yet.</div>}
        {data.items.map((log) => (
          <div key={log.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <span className="font-mono text-sm text-zinc-200">{log.action}</span>
              {log.targetType && <span className="ml-2 text-xs text-zinc-500">{log.targetType} {log.targetId?.slice(0, 8)}</span>}
            </div>
            <div className="text-xs text-zinc-500">{new Date(log.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
