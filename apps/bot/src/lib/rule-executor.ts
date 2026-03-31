import type { Message, GuildMember } from 'discord.js';
import type { RuleRecord, ActionExecutionDeps } from '@lunaria/rule-engine';
import type { RuleContext } from '@lunaria/types';
import { executeRulesForTrigger } from '@lunaria/rule-engine';
import { client } from '../client.js';
import { prisma, createAuditLog, Prisma } from '@lunaria/db';

function buildActionDeps(guildId: string): ActionExecutionDeps {
  return {
    sendMessage: async (channelId, content) => {
      const channel = await client.channels.fetch(channelId);
      if (channel?.isSendable()) await channel.send(content);
    },
    addReaction: async (channelId, messageId, emoji) => {
      const channel = await client.channels.fetch(channelId);
      if (channel?.isTextBased()) {
        const msg = await (channel as { messages: { fetch(id: string): Promise<{ react(e: string): Promise<unknown> }> } }).messages.fetch(messageId);
        await msg.react(emoji);
      }
    },
    addRole: async (_gid, userId, roleId) => {
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);
      await member.roles.add(roleId);
    },
    removeRole: async (_gid, userId, roleId) => {
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);
      await member.roles.remove(roleId);
    },
    createReminder: async (userId, gid, content, remindAt) => {
      const user = await prisma.user.findUnique({ where: { discordId: userId } });
      if (!user) return;
      await prisma.reminder.create({ data: { guildId: gid, userId: user.id, content, remindAt } });
    },
    warnUser: async (gid, targetId, reason, moderatorId) => {
      await prisma.moderationAction.create({
        data: { guildId: gid, actionType: 'warn', targetId, reason, moderatorId: moderatorId ?? null },
      });
    },
    emitLog: async (gid, message, level) => {
      await createAuditLog({ guildId: gid, actorType: 'bot', action: 'rule_engine.log', metadata: { message, level } });
    },
    suggestFaq: async (channelId, query) => {
      const guildRecord = await prisma.guild.findFirst({ where: {} }); // simplified
      if (!guildRecord) return;
      const articles = await prisma.faqArticle.findMany({
        where: { guildId: guildRecord.id, status: 'published', OR: [{ title: { contains: query, mode: 'insensitive' } }, { content: { contains: query, mode: 'insensitive' } }] },
        take: 3,
      });
      const channel = await client.channels.fetch(channelId);
      if (channel?.isSendable() && articles.length > 0) {
        const text = articles.map((a, i) => `${i + 1}. **${a.title}**`).join('\n');
        await channel.send(`📚 Related FAQ articles:\n${text}`);
      }
    },
  };
}

export async function executeRulesForMessage(message: Message, rules: RuleRecord[], guildId: string): Promise<void> {
  const ctx: RuleContext = {
    guildId,
    trigger: 'messageCreate',
    eventData: { content: message.content, isBot: message.author.bot },
    userId: message.author.id,
    channelId: message.channel.id,
    messageId: message.id,
    content: message.content,
    roles: message.member?.roles.cache.map((r) => r.id) ?? [],
  };

  const deps = buildActionDeps(guildId);
  const results = await executeRulesForTrigger(rules, ctx, deps);

  for (const result of results) {
    if (result.status !== 'skipped') {
      prisma.ruleRun.create({
        data: {
          guildId,
          ruleId: result.ruleId,
          status: result.status,
          trigger: 'messageCreate',
          context: ctx.eventData as unknown as Prisma.InputJsonValue,
          actionsRan: result.actionsRan,
          error: result.error ?? null,
          durationMs: result.durationMs,
        },
      }).catch(console.error);
    }
  }
}

export async function executeRulesForMemberJoin(member: GuildMember, rules: RuleRecord[], guildId: string): Promise<void> {
  const ctx: RuleContext = {
    guildId,
    trigger: 'memberJoin',
    eventData: { userId: member.id, username: member.user.username },
    userId: member.id,
    roles: [],
  };
  const deps = buildActionDeps(guildId);
  await executeRulesForTrigger(rules, ctx, deps);
}
