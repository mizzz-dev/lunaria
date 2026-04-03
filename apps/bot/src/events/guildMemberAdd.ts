import { EmbedBuilder, type GuildMember } from 'discord.js';
import { prisma } from '@lunaria/db';
import type { RuleRecord } from '@lunaria/rule-engine';
import type { RuleCondition, RuleAction } from '@lunaria/types';
import { executeRulesForMemberJoin } from '../lib/rule-executor.js';
import { client } from '../client.js';

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

  // ── Welcome Message ──────────────────────────────────────────────
  const welcomeConfig = await prisma.welcomeConfig.findUnique({ where: { guildId: guild.id } });
  if (welcomeConfig?.enabled) {
    const formatMsg = (template: string): string =>
      template
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{username}/g, member.user.username)
        .replace(/{server}/g, member.guild.name)
        .replace(/{count}/g, String(member.guild.memberCount));

    // Channel welcome
    if (welcomeConfig.channelId) {
      try {
        const channel = await client.channels.fetch(welcomeConfig.channelId);
        if (channel?.isTextBased() && 'send' in channel) {
          const embed = new EmbedBuilder()
            .setColor(welcomeConfig.embedColor)
            .setDescription(formatMsg(welcomeConfig.message))
            .setTimestamp();

          if (welcomeConfig.showAvatar) {
            embed.setThumbnail(member.user.displayAvatarURL());
          }

          await channel.send({ embeds: [embed] });
        }
      } catch (e) {
        console.error('[bot] Welcome channel message failed:', e);
      }
    }

    // DM welcome
    if (welcomeConfig.dmEnabled && welcomeConfig.dmMessage) {
      try {
        await member.send(formatMsg(welcomeConfig.dmMessage));
      } catch { /* User may have DMs disabled */ }
    }
  }

  // Execute memberJoin rules
  const rules = await prisma.rule.findMany({ where: { guildId: guild.id, enabled: true, trigger: 'memberJoin' } });
  const ruleRecords: RuleRecord[] = rules.map((r) => ({
    id: r.id, trigger: r.trigger, conditions: r.conditions as unknown as RuleCondition[], actions: r.actions as unknown as RuleAction[], priority: r.priority, enabled: r.enabled,
  }));
  if (ruleRecords.length > 0) {
    await executeRulesForMemberJoin(member, ruleRecords, guild.id);
  }
}
