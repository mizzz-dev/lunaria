import type { Message } from 'discord.js';
import { prisma } from '@lunaria/db';
import type { RuleRecord } from '@lunaria/rule-engine';
import type { RuleCondition, RuleAction } from '@lunaria/types';
import { executeRulesForMessage } from '../lib/rule-executor.js';
import { handleLevelXp } from '../lib/level-handler.js';

export const name = 'messageCreate';
export const once = false;

export async function execute(message: Message): Promise<void> {
  if (message.author.bot) return;
  if (!message.guild) return;

  const guild = await prisma.guild.findUnique({ where: { discordId: message.guild.id } });
  if (!guild) return;

  // Fetch active auto-responses
  const autoResponses = await prisma.autoResponse.findMany({
    where: { guildId: guild.id, enabled: true },
  });

  for (const ar of autoResponses) {
    if (ar.channelIds.length > 0 && !ar.channelIds.includes(message.channel.id)) continue;
    if (ar.ignoreBots && message.author.bot) continue;

    const content = ar.caseSensitive ? message.content : message.content.toLowerCase();
    const pattern = ar.caseSensitive ? ar.pattern : ar.pattern.toLowerCase();

    let matched = false;
    switch (ar.matchType) {
      case 'keyword': matched = content.includes(pattern); break;
      case 'startsWith': matched = content.startsWith(pattern); break;
      case 'exact': matched = content === pattern; break;
      case 'regex': {
        try { matched = new RegExp(ar.pattern, ar.caseSensitive ? undefined : 'i').test(message.content); }
        catch { matched = false; }
        break;
      }
    }

    if (!matched) continue;

    try {
      if (ar.responseType === 'reply') {
        await message.reply(ar.response);
      } else if (ar.responseType === 'react') {
        await message.react(ar.response);
      }
    } catch (e) {
      console.error('[bot] Auto response failed:', e);
    }
    break; // Only fire first matching response
  }

  // Fetch and execute rules
  const rules = await prisma.rule.findMany({
    where: { guildId: guild.id, enabled: true, trigger: 'messageCreate' },
  });

  const ruleRecords: RuleRecord[] = rules.map((r) => ({
    id: r.id,
    trigger: r.trigger,
    conditions: r.conditions as unknown as RuleCondition[],
    actions: r.actions as unknown as RuleAction[],
    priority: r.priority,
    enabled: r.enabled,
  }));

  if (ruleRecords.length > 0) {
    await executeRulesForMessage(message, ruleRecords, guild.id);
  }

  // Track analytics (fire-and-forget)
  prisma.analyticsEvent.create({
    data: { guildId: guild.id, eventType: 'message', userId: message.author.id, channelId: message.channel.id },
  }).catch(() => void 0);

  // ── Level XP ─────────────────────────────────────────────────────
  handleLevelXp(message, guild.id).catch((e) => console.error('[bot] Level XP error:', e));
}
