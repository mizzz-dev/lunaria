import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { apiPost } from '../lib/api-client.js';
import { prisma } from '@lunaria/db';

function parseDuration(when: string): Date | null {
  // Try ISO date first
  const isoDate = new Date(when);
  if (!isNaN(isoDate.getTime()) && isoDate > new Date()) return isoDate;

  // Try duration strings: 30m, 2h, 1d, 1h30m etc.
  const match = when.match(/^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?$/);
  if (!match || (!match[1] && !match[2] && !match[3])) return null;

  const days = parseInt(match[1] ?? '0');
  const hours = parseInt(match[2] ?? '0');
  const minutes = parseInt(match[3] ?? '0');
  const ms = (days * 86400 + hours * 3600 + minutes * 60) * 1000;
  if (ms <= 0) return null;
  return new Date(Date.now() + ms);
}

export const data = new SlashCommandBuilder()
  .setName('remind')
  .setDescription('Reminder management')
  .addSubcommand((sub) =>
    sub.setName('create').setDescription('Create a reminder')
      .addStringOption((o) => o.setName('content').setDescription('What to remind you of').setRequired(true))
      .addStringOption((o) => o.setName('when').setDescription('When (e.g. 1h, 30m, 2h30m, 2026-04-01T09:00:00Z)').setRequired(true)),
  );

export const execute: Command['execute'] = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });

  const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
  if (!guild) { await interaction.editReply('❌ Server not registered.'); return; }

  const content = interaction.options.getString('content', true);
  const when = interaction.options.getString('when', true);

  const remindAt = parseDuration(when);
  if (!remindAt) {
    await interaction.editReply('❌ Invalid time format. Use: `30m`, `2h`, `1d`, or ISO date like `2026-04-01T09:00:00Z`');
    return;
  }

  const result = await apiPost<{ success: boolean; data: { id: string } }>(
    `/guilds/${guild.id}/reminders`,
    { content, remindAt: remindAt.toISOString(), channelId: interaction.channel?.id },
  );

  if (!result.success) { await interaction.editReply('❌ Failed to create reminder.'); return; }

  await interaction.editReply(`⏰ Reminder set! I'll remind you <t:${Math.floor(remindAt.getTime() / 1000)}:R>.`);
};

export default { data, execute } satisfies Command;
