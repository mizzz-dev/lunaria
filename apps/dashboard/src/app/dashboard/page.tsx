import Link from 'next/link';
import { api } from '../../lib/api';
import { discordGuildIconUrl } from '@lunaria/shared';

export default async function DashboardPage() {
  let guilds: Array<{ id: string; name: string; icon: string | null; botPresent: boolean }> = [];
  try { guilds = await api.getGuilds(); }
  catch { guilds = []; }

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🌙</span>
            <h1 className="text-2xl font-bold text-zinc-100">Lunaria</h1>
          </div>
          <p className="text-zinc-400">Select a server to manage</p>
        </div>

        {guilds.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center">
            <p className="text-zinc-400">No manageable servers found.</p>
            <p className="mt-2 text-sm text-zinc-500">You need Manage Server permission to access a server.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guilds.map((guild) => {
              const iconUrl = discordGuildIconUrl(guild.id, guild.icon);
              return (
                <div key={guild.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700">
                  <div className="flex items-center gap-3 mb-4">
                    {iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={iconUrl} alt={guild.name} className="h-12 w-12 rounded-full" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-700 text-xl font-bold text-zinc-300">
                        {guild.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-zinc-100 truncate max-w-[140px]">{guild.name}</p>
                      <p className={`text-xs ${guild.botPresent ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {guild.botPresent ? '● Bot active' : '○ Bot not added'}
                      </p>
                    </div>
                  </div>
                  {guild.botPresent ? (
                    <Link href={`/dashboard/${guild.id}`} className="block w-full rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
                      Manage
                    </Link>
                  ) : (
                    <a href={`https://discord.com/api/oauth2/authorize?client_id=${process.env['NEXT_PUBLIC_DISCORD_CLIENT_ID']}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`} target="_blank" rel="noreferrer" className="block w-full rounded-lg bg-zinc-700 px-4 py-2 text-center text-sm font-medium text-zinc-300 hover:bg-zinc-600 transition-colors">
                      Add Bot
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
