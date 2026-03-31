import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { apiPost } from '../lib/api-client.js';
import { prisma } from '@lunaria/db';

export const data = new SlashCommandBuilder()
  .setName('team')
  .setDescription('Team management')
  .addSubcommand((sub) =>
    sub.setName('split').setDescription('Randomly split members into teams')
      .addIntegerOption((o) => o.setName('team_count').setDescription('Number of teams (default: 2)').setMinValue(2).setMaxValue(10))
      .addStringOption((o) => o.setName('members').setDescription('Mention members or leave empty to use voice channel').setRequired(false)),
  );

export const execute: Command['execute'] = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.guild) return;
  await interaction.deferReply();

  const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
  if (!guild) { await interaction.editReply('❌ Server not registered.'); return; }

  const teamCount = interaction.options.getInteger('team_count') ?? 2;
  const membersStr = interaction.options.getString('members');

  let playerIds: string[] = [];

  if (membersStr) {
    // Parse mentioned user IDs
    const mentionPattern = /<@!?(\d+)>/g;
    let match;
    while ((match = mentionPattern.exec(membersStr)) !== null) {
      if (match[1]) playerIds.push(match[1]);
    }
  } else {
    // Use voice channel members
    const member = interaction.guild.members.cache.get(interaction.user.id);
    const voiceChannel = member?.voice.channel;
    if (voiceChannel) {
      playerIds = voiceChannel.members.map((m) => m.id);
    }
  }

  if (playerIds.length < 2) {
    await interaction.editReply('❌ Need at least 2 players. Mention members or join a voice channel.');
    return;
  }

  const result = await apiPost<{
    success: boolean;
    data: { id: string; teams: Array<{ name: string; members: Array<{ userId: string }> }> };
  }>(
    `/guilds/${guild.id}/team-splits`,
    { name: `Team Split by ${interaction.user.username}`, splitMode: 'random', teamCount, playerIds },
  );

  if (!result.success) { await interaction.editReply('❌ Failed to create team split.'); return; }

  const teamColors = [0x6366f1, 0x22c55e, 0xf59e0b, 0xef4444, 0x3b82f6];
  const embed = new EmbedBuilder()
    .setColor(teamColors[0] ?? 0x6366f1)
    .setTitle('⚔️ Teams')
    .addFields(
      result.data.teams.map((team, i) => ({
        name: `${['🟣', '🟢', '🟡', '🔴', '🔵'][i] ?? '⚪'} ${team.name}`,
        value: team.members.length > 0 ? team.members.map((m) => `<@${m.userId}>`).join(', ') : 'Empty',
        inline: true,
      })),
    )
    .setFooter({ text: `ID: ${result.data.id}` });

  await interaction.editReply({ embeds: [embed] });
};

export default { data, execute } satisfies Command;
