import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { apiGet } from '../lib/api-client.js';
import { prisma } from '@lunaria/db';

export const data = new SlashCommandBuilder()
  .setName('faq')
  .setDescription('Search FAQ articles')
  .addSubcommand((sub) =>
    sub.setName('search').setDescription('Search FAQ articles')
      .addStringOption((o) => o.setName('query').setDescription('Search query').setRequired(true)),
  );

export const execute: Command['execute'] = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });

  const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
  if (!guild) { await interaction.editReply('❌ Server not registered.'); return; }

  const query = interaction.options.getString('query', true);
  const result = await apiGet<{
    success: boolean;
    data: { items: Array<{ id: string; title: string; content: string }> };
  }>(`/guilds/${guild.id}/faqs?q=${encodeURIComponent(query)}&pageSize=5`);

  if (!result.success) { await interaction.editReply('❌ Failed to search FAQ.'); return; }

  if (result.data.items.length === 0) {
    await interaction.editReply(`❌ No FAQ articles found for "${query}".`);
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x6366f1)
    .setTitle(`📚 FAQ: "${query}"`)
    .setDescription(
      result.data.items.map((a, i) => `**${i + 1}. ${a.title}**\n${a.content.slice(0, 150)}...`).join('\n\n'),
    );

  await interaction.editReply({ embeds: [embed] });
};

export default { data, execute } satisfies Command;
