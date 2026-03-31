import type { Client } from 'discord.js';
import { prisma } from '@lunaria/db';

export const name = 'ready';
export const once = true;

export async function execute(client: Client<true>): Promise<void> {
  console.log(`[bot] Logged in as ${client.user.tag}`);
  console.log(`[bot] Serving ${client.guilds.cache.size} guilds`);

  // Sync all guilds to DB
  for (const [, guild] of client.guilds.cache) {
    await prisma.guild.upsert({
      where: { discordId: guild.id },
      create: {
        discordId: guild.id,
        name: guild.name,
        icon: guild.icon,
        ownerId: guild.ownerId,
        botJoinedAt: new Date(),
      },
      update: {
        name: guild.name,
        icon: guild.icon,
        ownerId: guild.ownerId,
      },
    }).catch((e: unknown) => console.error('[bot] Guild sync failed:', e));
  }
}
