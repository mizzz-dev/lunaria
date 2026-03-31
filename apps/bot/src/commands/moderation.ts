import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { prisma } from '@lunaria/db';

export const data = new SlashCommandBuilder()
  .setName('moderation')
  .setDescription('モデレーションアクションを実行します')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommand((sub) =>
    sub
      .setName('warn')
      .setDescription('ユーザーに警告を送ります')
      .addUserOption((o) => o.setName('user').setDescription('対象ユーザー').setRequired(true))
      .addStringOption((o) => o.setName('reason').setDescription('理由').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('history')
      .setDescription('ユーザーのモデレーション履歴を表示します')
      .addUserOption((o) => o.setName('user').setDescription('対象ユーザー').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('clear')
      .setDescription('モデレーション記録を削除します')
      .addStringOption((o) => o.setName('action_id').setDescription('アクション ID').setRequired(true)),
  );

export const execute: Command['execute'] = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });

  const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
  if (!guild) {
    await interaction.editReply('❌ サーバーが登録されていません。');
    return;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === 'warn') {
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);

    await prisma.moderationAction.create({
      data: {
        guildId: guild.id,
        targetId: target.id,
        actionType: 'warn',
        reason,
        moderatorId: interaction.user.id,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(0xf59e0b)
      .setTitle('⚠️ 警告を発行しました')
      .addFields(
        { name: '対象', value: `${target.tag} (${target.id})`, inline: true },
        { name: '理由', value: reason, inline: false },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (sub === 'history') {
    const target = interaction.options.getUser('user', true);
    const actions = await prisma.moderationAction.findMany({
      where: { guildId: guild.id, targetId: target.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (actions.length === 0) {
      await interaction.editReply(`✅ ${target.tag} のモデレーション記録はありません。`);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle(`🔍 ${target.tag} のモデレーション履歴`)
      .setDescription(
        actions
          .map((a) => `**${a.actionType}** — ${a.reason ?? '理由なし'} (${a.createdAt.toLocaleDateString('ja-JP')})`)
          .join('\n'),
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (sub === 'clear') {
    const actionId = interaction.options.getString('action_id', true);
    const action = await prisma.moderationAction.findFirst({ where: { id: actionId, guildId: guild.id } });
    if (!action) {
      await interaction.editReply('❌ 指定されたアクションが見つかりません。');
      return;
    }
    await prisma.moderationAction.delete({ where: { id: actionId } });
    await interaction.editReply(`✅ アクション \`${actionId}\` を削除しました。`);
  }
};

export default { data, execute } satisfies Command;
