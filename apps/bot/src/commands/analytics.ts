import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { prisma } from '@lunaria/db';

export const data = new SlashCommandBuilder()
  .setName('analytics')
  .setDescription('サーバーのアナリティクスを表示します')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addStringOption((o) =>
    o
      .setName('period')
      .setDescription('集計期間')
      .addChoices(
        { name: '過去 7 日', value: '7d' },
        { name: '過去 30 日', value: '30d' },
        { name: '過去 90 日', value: '90d' },
      ),
  );

export const execute: Command['execute'] = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });

  const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
  if (!guild) {
    await interaction.editReply('❌ サーバーが登録されていません。');
    return;
  }

  const period = interaction.options.getString('period') ?? '30d';
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [memberCount, messageCount, moderationCount, pollCount, eventCount] = await Promise.all([
    prisma.guildMembership.count({ where: { guildId: guild.id } }),
    prisma.analyticsEvent.count({ where: { guildId: guild.id, eventType: 'message', occurredAt: { gte: from } } }),
    prisma.moderationAction.count({ where: { guildId: guild.id, createdAt: { gte: from } } }),
    prisma.poll.count({ where: { guildId: guild.id, createdAt: { gte: from } } }),
    prisma.event.count({ where: { guildId: guild.id, createdAt: { gte: from } } }),
  ]);

  const embed = new EmbedBuilder()
    .setColor(0x6366f1)
    .setTitle(`📊 アナリティクス — 過去 ${days} 日間`)
    .setDescription(`サーバー: **${guild.name}**`)
    .addFields(
      { name: '👥 メンバー数', value: `${memberCount.toLocaleString()}`, inline: true },
      { name: '💬 メッセージ数', value: `${messageCount.toLocaleString()}`, inline: true },
      { name: '🔨 モデレーション', value: `${moderationCount.toLocaleString()}`, inline: true },
      { name: '📊 投票数', value: `${pollCount.toLocaleString()}`, inline: true },
      { name: '📅 イベント数', value: `${eventCount.toLocaleString()}`, inline: true },
    )
    .setFooter({ text: `集計期間: ${from.toLocaleDateString('ja-JP')} 〜 今日` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
};

export default { data, execute } satisfies Command;
