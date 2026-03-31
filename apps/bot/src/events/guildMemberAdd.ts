import type { GuildMember } from 'discord.js';
import { prisma } from '@lunaria/db';
import type { RuleRecord } from '@lunaria/rule-engine';
import type { RuleCondition, RuleAction } from '@lunaria/types';
import { executeRulesForMemberJoin } from '../lib/rule-executor.js';

export const name = 'guildMemberAdd';
export const once = false;

export async function execute(member: GuildMember): Promise<void> {
  const guild = await prisma.guild.findUnique({ where: { discordId: member.guild.id } });
  if (!guild) return;

  // Upsert user
  const user = await prisma.user.upsert({
    where: { discordId: member.id },
    create: { discordId: member.id, username: member.user.username, discriminator: member.user.discriminator ?? '0', avatar: member.user.avatar, globalName: member.user.globalName },
    update: { username: member.user.username, avatar: member.user.avatar, globalName: member.user.globalName },
  });

  // Upsert membership
  await prisma.guildMembership.upsert({
    where: { guildId_userId: { guildId: guild.id, userId: user.id } },
    create: { guildId: guild.id, userId: user.id, discordRoles: member.roles.cache.map((r) => r.id), joinedAt: member.joinedAt },
    update: { discordRoles: member.roles.cache.map((r) => r.id) },
  });

  // Track analytics
  prisma.analyticsEvent.create({ data: { guildId: guild.id, eventType: 'member_join', userId: member.id } }).catch(() => void 0);

  // Execute memberJoin rules
  const rules = await prisma.rule.findMany({ where: { guildId: guild.id, enabled: true, trigger: 'memberJoin' } });
  const ruleRecords: RuleRecord[] = rules.map((r) => ({
    id: r.id, trigger: r.trigger, conditions: r.conditions as unknown as RuleCondition[], actions: r.actions as unknown as RuleAction[], priority: r.priority, enabled: r.enabled,
  }));
  if (ruleRecords.length > 0) {
    await executeRulesForMemberJoin(member, ruleRecords, guild.id);
  }
}
