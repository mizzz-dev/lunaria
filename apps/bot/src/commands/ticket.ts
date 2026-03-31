import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { prisma } from '@lunaria/db';

export const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('チケットシステムを管理します')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub.setName('panel').setDescription('チケット作成パネルを設置します'),
  )
  .addSubcommand((sub) =>
    sub
      .setName('close')
      .setDescription('チケットを閉じます')
      .addStringOption((o) => o.setName('ticket_id').setDescription('チケット ID').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub.setName('list').setDescription('オープン中のチケット一覧を表示します'),
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

  if (sub === 'panel') {
    const config = await prisma.ticketConfig.findUnique({ where: { guildId: guild.id } });
    if (!config?.enabled) {
      await interaction.editReply('❌ チケットシステムが有効ではありません。先に `/settings` から有効化してください。');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle('🎫 サポートチケット')
      .setDescription('サポートが必要な場合は下のボタンをクリックしてチケットを作成してください。');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('lunaria:ticket:open')
        .setLabel('チケットを作成')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎫'),
    );

    const targetChannel = config.panelChannelId
      ? await interaction.guild.channels.fetch(config.panelChannelId).catch(() => null)
      : interaction.channel;

    if (!targetChannel?.isTextBased()) {
      await interaction.editReply('❌ パネルを送信するチャンネルが見つかりません。');
      return;
    }

    await targetChannel.send({ embeds: [embed], components: [row] });
    await interaction.editReply(`✅ チケットパネルを ${targetChannel} に設置しました。`);
    return;
  }

  if (sub === 'close') {
    const ticketId = interaction.options.getString('ticket_id', true);
    const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, guildId: guild.id } });
    if (!ticket) {
      await interaction.editReply('❌ チケットが見つかりません。');
      return;
    }
    if (ticket.status === 'closed') {
      await interaction.editReply('❌ このチケットは既に閉じられています。');
      return;
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'closed', closedAt: new Date(), closedBy: interaction.user.id },
    });

    // Optionally delete channel
    try {
      const ch = await interaction.guild.channels.fetch(ticket.channelId);
      if (ch) await ch.delete('Ticket closed');
    } catch { /* already gone */ }

    await interaction.editReply(`✅ チケット \`${ticketId}\` を閉じました。`);
    return;
  }

  if (sub === 'list') {
    const tickets = await prisma.ticket.findMany({
      where: { guildId: guild.id, status: { in: ['open', 'claimed'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (tickets.length === 0) {
      await interaction.editReply('オープン中のチケットはありません。');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle('🎫 オープン中のチケット')
      .setDescription(
        tickets.map((t) => `\`${t.id.slice(0, 8)}\` <@${t.openedBy}> — ${t.status}`).join('\n'),
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};

export default { data, execute } satisfies Command;
