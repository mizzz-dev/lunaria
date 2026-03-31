import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { prisma } from '@lunaria/db';

export const data = new SlashCommandBuilder()
  .setName('level')
  .setDescription('レベルを確認します')
  .addSubcommand((sub) =>
    sub
      .setName('rank')
      .setDescription('自分または他のユーザーのランクを表示します')
      .addUserOption((o) => o.setName('user').setDescription('ユーザー（省略で自分）')),
  )
  .addSubcommand((sub) =>
    sub.setName('leaderboard').setDescription('サーバーのランキングを表示します'),
  );

export const execute: Command['execute'] = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: false });

  const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
  if (!guild) {
    await interaction.editReply('❌ サーバーが登録されていません。');
    return;
  }

  const config = await prisma.levelConfig.findUnique({ where: { guildId: guild.id } });
  if (!config?.enabled) {
    await interaction.editReply('❌ レベルシステムが有効ではありません。');
    return;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === 'rank') {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const levelData = await prisma.userLevel.findUnique({
      where: { guildId_userId: { guildId: guild.id, userId: target.id } },
    });

    const xp = levelData?.xp ?? 0;
    const level = levelData?.level ?? 0;
    const messages = levelData?.messages ?? 0;
    const nextLevelXp = (level + 1) * 100;
    const progress = Math.min(Math.floor((xp / nextLevelXp) * 20), 20);
    const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle(`⭐ ${target.displayName} のランク`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: 'レベル', value: `**${level}**`, inline: true },
        { name: 'XP', value: `${xp} / ${nextLevelXp}`, inline: true },
        { name: 'メッセージ数', value: `${messages}`, inline: true },
        { name: '進捗', value: `\`${bar}\` ${Math.floor((xp / nextLevelXp) * 100)}%`, inline: false },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (sub === 'leaderboard') {
    const top = await prisma.userLevel.findMany({
      where: { guildId: guild.id },
      orderBy: { xp: 'desc' },
      take: 10,
    });

    if (top.length === 0) {
      await interaction.editReply('まだランキングデータがありません。');
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = top.map((u, i) =>
      `${medals[i] ?? `**${i + 1}.**`} <@${u.userId}> — Lv.**${u.level}** (${u.xp} XP)`,
    );

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle('🏆 レベルランキング')
      .setDescription(lines.join('\n'))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};

export default { data, execute } satisfies Command;
