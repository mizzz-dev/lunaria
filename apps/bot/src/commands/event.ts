import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { apiPost } from '../lib/api-client.js';
import { prisma } from '@lunaria/db';

export const data = new SlashCommandBuilder()
  .setName('event')
  .setDescription('Event management')
  .addSubcommand((sub) =>
    sub.setName('create').setDescription('Create an event')
      .addStringOption((o) => o.setName('title').setDescription('Event title').setRequired(true))
      .addStringOption((o) => o.setName('starts_at').setDescription('Start time (ISO 8601 e.g. 2026-04-01T18:00:00Z)').setRequired(true))
      .addStringOption((o) => o.setName('description').setDescription('Description').setRequired(false))
      .addIntegerOption((o) => o.setName('max_participants').setDescription('Max participants').setMinValue(1)),
  )
  .addSubcommand((sub) =>
    sub.setName('join').setDescription('Join an event').addStringOption((o) => o.setName('event_id').setDescription('Event ID').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub.setName('decline').setDescription('Decline an event').addStringOption((o) => o.setName('event_id').setDescription('Event ID').setRequired(true)),
  );

export const execute: Command['execute'] = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: false });

  const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
  if (!guild) { await interaction.editReply('❌ Server not registered.'); return; }

  const sub = interaction.options.getSubcommand();

  if (sub === 'create') {
    const title = interaction.options.getString('title', true);
    const startsAt = interaction.options.getString('starts_at', true);
    const description = interaction.options.getString('description') ?? undefined;
    const maxParticipants = interaction.options.getInteger('max_participants') ?? undefined;

    const result = await apiPost<{ success: boolean; data: { id: string; title: string } }>(
      `/guilds/${guild.id}/events`,
      { title, startsAt, description, maxParticipants, channelId: interaction.channel?.id },
    );

    if (!result.success) { await interaction.editReply('❌ Failed to create event.'); return; }

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle(`🗓 ${result.data.title}`)
      .addFields(
        { name: 'Starts', value: `<t:${Math.floor(new Date(startsAt).getTime() / 1000)}:F>` },
        { name: 'ID', value: result.data.id },
      )
      .setDescription(description ?? null);
    await interaction.editReply({ embeds: [embed] });

  } else if (sub === 'join' || sub === 'decline') {
    const eventId = interaction.options.getString('event_id', true);
    const status = sub === 'join' ? 'going' : 'declined';

    const result = await apiPost(`/guilds/${guild.id}/events/${eventId}/participants`, { status });
    if (!(result as { success: boolean }).success) { await interaction.editReply(`❌ Failed to update RSVP.`); return; }
    await interaction.editReply(`✅ You are now marked as **${status === 'going' ? 'Going ✅' : 'Declined ❌'}** for this event.`);
  }
};

export default { data, execute } satisfies Command;
