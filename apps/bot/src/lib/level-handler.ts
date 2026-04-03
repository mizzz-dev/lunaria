import type { Message } from 'discord.js';
import { prisma } from '@lunaria/db';
import { client } from '../client.js';

/** XP required to reach a given level: level * 100 */
function xpForLevel(level: number): number {
  return level * 100;
}

/** Calculate level from total XP */
function calcLevel(xp: number): number {
  let level = 0;
  let required = xpForLevel(level + 1);
  while (xp >= required) {
    level++;
    required += xpForLevel(level + 1);
  }
  return level;
}

export async function handleLevelXp(message: Message, guildId: string): Promise<void> {
  if (!message.guild) return;

  const config = await prisma.levelConfig.findUnique({ where: { guildId } });
  if (!config?.enabled) return;

  // Ignored channels / roles checks
  if (config.ignoredChannels.includes(message.channel.id)) return;
  const member = message.member;
  if (member && config.ignoredRoles.some((r) => member.roles.cache.has(r))) return;

  const userId = message.author.id;
  const now = new Date();

  // Cooldown check
  const current = await prisma.userLevel.findUnique({ where: { guildId_userId: { guildId, userId } } });

  if (current?.lastXpAt) {
    const elapsed = (now.getTime() - current.lastXpAt.getTime()) / 1000;
    if (elapsed < config.xpCooldownSec) return;
  }

  const xpGain = config.xpPerMessage;
  const prevXp = current?.xp ?? 0;
  const prevLevel = current?.level ?? 0;
  const newXp = prevXp + xpGain;
  const newLevel = calcLevel(newXp);

  const updated = await prisma.userLevel.upsert({
    where: { guildId_userId: { guildId, userId } },
    create: { guildId, userId, xp: newXp, level: newLevel, messages: 1, lastXpAt: now },
    update: { xp: newXp, level: newLevel, messages: { increment: 1 }, lastXpAt: now },
  });

  // Level up handling
  if (newLevel > prevLevel) {
    // Level-up message
    if (config.levelUpChannelId || message.channel.isTextBased()) {
      try {
        const channelId = config.levelUpChannelId ?? message.channel.id;
        const channel = await client.channels.fetch(channelId);
        if (channel?.isTextBased() && 'send' in channel) {
          const msg = config.levelUpMessage
            .replace(/{user}/g, `<@${userId}>`)
            .replace(/{level}/g, String(newLevel))
            .replace(/{xp}/g, String(newXp));
          await channel.send(msg);
        }
      } catch { /* channel fetch may fail */ }
    }

    // Role rewards
    const rewards = await prisma.levelReward.findMany({
      where: { guildId, level: { lte: newLevel } },
      orderBy: { level: 'asc' },
    });

    for (const reward of rewards) {
      try {
        // Add role
        if (!member?.roles.cache.has(reward.roleId)) {
          await member?.roles.add(reward.roleId);
        }
        // Remove on level (if configured and passed)
        if (reward.removeOnLevel && newLevel >= reward.removeOnLevel) {
          if (member?.roles.cache.has(reward.roleId)) {
            await member.roles.remove(reward.roleId);
          }
        }
      } catch { /* role may not exist */ }
    }
  }

  void updated;
}
