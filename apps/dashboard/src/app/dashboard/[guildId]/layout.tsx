import { Sidebar } from '../../../components/Sidebar';
import { api } from '../../../lib/api';

export default async function GuildLayout({ children, params }: { children: React.ReactNode; params: { guildId: string } }) {
  const { guildId } = params;
  let guildName: string | undefined;
  try {
    const guild = await api.getGuild(guildId);
    guildName = guild.name;
  } catch {
    guildName = guildId;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar guildId={guildId} guildName={guildName} />
      <main className="flex-1 overflow-y-auto bg-zinc-950 p-6">
        {children}
      </main>
    </div>
  );
}
