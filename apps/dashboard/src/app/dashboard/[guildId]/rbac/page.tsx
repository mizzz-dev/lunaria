import { api } from '../../../../lib/api.js';
interface RoleOverride { id: string; roleKey: string; discordRoles: string[]; permissions: string[] }
interface GuildMember { id: string; discordId: string; systemRole: string }
export default async function RbacPage({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  let overrides: RoleOverride[] = [];
  let members: GuildMember[] = [];
  try {
    const [od, md] = await Promise.all([
      api.getRoleOverrides(guildId) as Promise<{ items: RoleOverride[] }>,
      api.getGuildMembers(guildId) as Promise<{ items: GuildMember[] }>,
    ]);
    overrides = od.items;
    members = md.items;
  } catch { /* empty */ }

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      owner: 'bg-amber-900/40 text-amber-400',
      admin: 'bg-red-900/40 text-red-400',
      moderator: 'bg-blue-900/40 text-blue-400',
      member: 'bg-zinc-800 text-zinc-400',
    };
    return map[role] ?? 'bg-zinc-800 text-zinc-400';
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-6 text-xl font-bold text-zinc-100">Role & Permissions</h1>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">Role Overrides</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
          {overrides.length === 0 && <div className="p-6 text-center text-zinc-400 text-sm">No role overrides configured.</div>}
          {overrides.map((o) => (
            <div key={o.id} className="px-5 py-3">
              <p className="text-sm font-medium text-zinc-200">{o.roleKey}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Discord roles: {o.discordRoles.length > 0 ? o.discordRoles.join(', ') : 'none'} ·{' '}
                {o.permissions.length} permission{o.permissions.length !== 1 ? 's' : ''}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">Members</h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
          {members.length === 0 && <div className="p-6 text-center text-zinc-400 text-sm">No members found.</div>}
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-5 py-3">
              <p className="text-sm font-mono text-zinc-300">{m.discordId}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs ${roleBadge(m.systemRole)}`}>{m.systemRole}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
