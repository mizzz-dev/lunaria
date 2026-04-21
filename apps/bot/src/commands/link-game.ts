import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { prisma } from '@lunaria/db';

const SUPPORTED_GAMES = ['genshin', 'starrail', 'honkai', 'minecraft', 'valorant', 'apex', 'other'] as const;
type SupportedGame = typeof SUPPORTED_GAMES[number];

const GAME_LABELS: Record<SupportedGame, string> = {
  genshin: '原神',
  starrail: '崩壊：スターレイル',
  honkai: '崩壊3rd',
  minecraft: 'Minecraft',
  valorant: 'VALORANT',
  apex: 'Apex Legends',
  other: 'その他',
};

export const data = new SlashCommandBuilder()
  .setName('link-game')
  .setDescription('ゲームアカウントをリンクします')
  .addSubcommand((sub) =>
    sub
      .setName('add')
      .setDescription('ゲームアカウントを追加します')
      .addStringOption((o) =>
        o
          .setName('game')
          .setDescription('ゲーム名')
          .setRequired(true)
          .addChoices(...SUPPORTED_GAMES.map((g) => ({ name: GAME_LABELS[g], value: g }))),
      )
      .addStringOption((o) => o.setName('uid').setDescription('ゲーム内 UID').setRequired(true))
      .addStringOption((o) => o.setName('username').setDescription('ゲーム内ユーザー名')),
  )
  .addSubcommand((sub) =>
    sub.setName('list').setDescription('リンク済みアカウントを表示します'),
  )
  .addSubcommand((sub) =>
    sub
      .setName('remove')
      .setDescription('ゲームアカウントのリンクを解除します')
      .addStringOption((o) =>
        o
          .setName('game')
          .setDescription('ゲーム名')
          .setRequired(true)
          .addChoices(...SUPPORTED_GAMES.map((g) => ({ name: GAME_LABELS[g], value: g }))),
      ),
  );

export const execute: Command['execute'] = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ ephemeral: true });

  const user = await prisma.user.upsert({
    where: { discordId: interaction.user.id },
    create: { discordId: interaction.user.id, username: interaction.user.username },
    update: {},
  });

  const sub = interaction.options.getSubcommand();

  if (sub === 'add') {
    const game = interaction.options.getString('game', true) as SupportedGame;
    const uid = interaction.options.getString('uid', true);
    const username = interaction.options.getString('username') ?? null;

    await prisma.gameLink.upsert({
      where: { userId_platform: { userId: user.id, platform: game } },
      create: { userId: user.id, platform: game, platformId: uid, displayName: username },
      update: { platformId: uid, displayName: username },
    });

    const embed = new EmbedBuilder()
      .setColor(0x10b981)
      .setTitle('🎮 ゲームアカウントをリンクしました')
      .addFields(
        { name: 'ゲーム', value: GAME_LABELS[game], inline: true },
        { name: 'UID', value: uid, inline: true },
        ...(username ? [{ name: 'ユーザー名', value: username, inline: true }] : []),
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (sub === 'list') {
    const links = await prisma.gameLink.findMany({ where: { userId: user.id } });

    if (links.length === 0) {
      await interaction.editReply('ゲームアカウントがリンクされていません。`/link-game add` で追加できます。');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle('🎮 リンク済みゲームアカウント')
      .setDescription(
        links
          .map((l) => `**${GAME_LABELS[l.platform as SupportedGame] ?? l.platform}**: UID \`${l.platformId}\`${l.displayName ? ` (${l.displayName})` : ''}`)
          .join('\n'),
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (sub === 'remove') {
    const game = interaction.options.getString('game', true);
    const link = await prisma.gameLink.findUnique({ where: { userId_platform: { userId: user.id, platform: game } } });
    if (!link) {
      await interaction.editReply('❌ 指定されたゲームのリンクが見つかりません。');
      return;
    }
    await prisma.gameLink.delete({ where: { userId_platform: { userId: user.id, platform: game } } });
    await interaction.editReply(`✅ **${GAME_LABELS[game as SupportedGame] ?? game}** のリンクを解除しました。`);
  }
};

export default { data, execute } satisfies Command;
