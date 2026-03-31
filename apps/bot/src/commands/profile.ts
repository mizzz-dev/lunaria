import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { prisma } from '@lunaria/db';
import { discordAvatarUrl } from '@lunaria/shared';

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('View a user\'s profile')
  .addUserOption((o) => o.setName('user').setDescription('User to view (default: yourself)'));

export const execute: Command['execute'] = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });

  const targetUser = interaction.options.getUser('user') ?? interaction.user;

  const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
  if (!guild) { await interaction.editReply('❌ Server not registered.'); return; }

  const user = await prisma.user.findUnique({ where: { discordId: targetUser.id } });
  if (!user) { await interaction.editReply('❌ User not found in database.'); return; }

  const membership = await prisma.guildMembership.findUnique({
    where: { guildId_userId: { guildId: guild.id, userId: user.id } },
    include: { roleAssignments: { include: { role: { select: { name: true } } } } },
  });

  const warnCount = await prisma.moderationAction.count({
    where: { guildId: guild.id, targetId: targetUser.id, actionType: 'warn' },
  });

  const avatarUrl = discordAvatarUrl(targetUser.id, targetUser.avatar);
  const roles = membership?.roleAssignments.map((a) => a.role.name).join(', ') || 'member';

  const embed = new EmbedBuilder()
    .setColor(0x6366f1)
    .setTitle(targetUser.globalName ?? targetUser.username)
    .setThumbnail(avatarUrl)
    .addFields(
      { name: 'Discord ID', value: targetUser.id, inline: true },
      { name: 'Platform Roles', value: roles, inline: true },
      { name: 'Warnings', value: String(warnCount), inline: true },
      { name: 'Member Since', value: membership?.joinedAt ? `<t:${Math.floor(membership.joinedAt.getTime() / 1000)}:D>` : 'Unknown', inline: true },
    );

  await interaction.editReply({ embeds: [embed] });
};

export default { data, execute } satisfies Command;
