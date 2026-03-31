import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { apiPost, apiDelete } from '../lib/api-client.js';
import { prisma } from '@lunaria/db';

export const data = new SlashCommandBuilder()
  .setName('lfg')
  .setDescription('Looking for group')
  .addSubcommand((sub) =>
    sub.setName('create').setDescription('Create an LFG post')
      .addStringOption((o) => o.setName('title').setDescription('What are you looking for?').setRequired(true))
      .addStringOption((o) => o.setName('game').setDescription('Game name').setRequired(false))
      .addIntegerOption((o) => o.setName('max_players').setDescription('Max players').setMinValue(2)),
  )
  .addSubcommand((sub) =>
    sub.setName('join').setDescription('Join an LFG post').addStringOption((o) => o.setName('lfg_id').setDescription('LFG post ID').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub.setName('leave').setDescription('Leave an LFG post').addStringOption((o) => o.setName('lfg_id').setDescription('LFG post ID').setRequired(true)),
  );

export const execute: Command['execute'] = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.guild) return;
  await interaction.deferReply();

  const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
  if (!guild) { await interaction.editReply('❌ Server not registered.'); return; }

  const sub = interaction.options.getSubcommand();

  if (sub === 'create') {
    const title = interaction.options.getString('title', true);
    const game = interaction.options.getString('game') ?? undefined;
    const maxPlayers = interaction.options.getInteger('max_players') ?? undefined;

    const result = await apiPost<{ success: boolean; data: { id: string } }>(
      `/guilds/${guild.id}/lfg`,
      { title, game, maxPlayers, channelId: interaction.channel?.id },
    );
    if (!result.success) { await interaction.editReply('❌ Failed to create LFG post.'); return; }

    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle(`🎮 ${title}`)
      .addFields(
        ...(game ? [{ name: 'Game', value: game, inline: true }] : []),
        ...(maxPlayers ? [{ name: 'Max Players', value: String(maxPlayers), inline: true }] : []),
        { name: 'LFG ID', value: result.data.id },
      )
      .setFooter({ text: `Use /lfg join ${result.data.id} to join!` });
    await interaction.editReply({ embeds: [embed] });

  } else if (sub === 'join') {
    const lfgId = interaction.options.getString('lfg_id', true);
    const result = await apiPost(`/guilds/${guild.id}/lfg/${lfgId}/entries`, {});
    if (!(result as { success: boolean }).success) { await interaction.editReply('❌ Failed to join LFG post.'); return; }
    await interaction.editReply(`✅ Joined LFG post **${lfgId}**!`);

  } else if (sub === 'leave') {
    const lfgId = interaction.options.getString('lfg_id', true);
    await apiDelete(`/guilds/${guild.id}/lfg/${lfgId}/entries/me`);
    await interaction.editReply(`✅ Left LFG post **${lfgId}**.`);
  }
};

export default { data, execute } satisfies Command;
