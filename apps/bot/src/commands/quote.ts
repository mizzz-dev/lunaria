import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { apiGet, apiPost } from '../lib/api-client.js';
import { prisma } from '@lunaria/db';

export const data = new SlashCommandBuilder()
  .setName('quote')
  .setDescription('Quote management')
  .addSubcommand((sub) =>
    sub.setName('add').setDescription('Add a quote')
      .addStringOption((o) => o.setName('content').setDescription('Quote content').setRequired(true))
      .addStringOption((o) => o.setName('author').setDescription('Quote author').setRequired(true))
      .addStringOption((o) => o.setName('tags').setDescription('Comma-separated tags').setRequired(false)),
  )
  .addSubcommand((sub) =>
    sub.setName('random').setDescription('Get a random quote')
      .addStringOption((o) => o.setName('tag').setDescription('Filter by tag').setRequired(false)),
  )
  .addSubcommand((sub) =>
    sub.setName('list').setDescription('List recent quotes'),
  );

export const execute: Command['execute'] = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.guild) return;

  const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
  if (!guild) {
    await interaction.reply({ content: '❌ This server is not registered. Please use the dashboard to set up.', ephemeral: true });
    return;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === 'add') {
    await interaction.deferReply();
    const content = interaction.options.getString('content', true);
    const author = interaction.options.getString('author', true);
    const tagsStr = interaction.options.getString('tags');
    const tags = tagsStr ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean) : [];

    const result = await apiPost<{ success: boolean; data: { id: string } }>(
      `/guilds/${guild.id}/quotes`,
      { content, author, tags, authorId: interaction.user.id, channelId: interaction.channel?.id },
    );

    if (!result.success) {
      await interaction.editReply('❌ Failed to save quote.');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle('✅ Quote Added')
      .setDescription(`"${content}"`)
      .addFields({ name: '— Author', value: author })
      .setFooter({ text: `ID: ${result.data.id}` });
    await interaction.editReply({ embeds: [embed] });

  } else if (sub === 'random') {
    await interaction.deferReply();
    const tag = interaction.options.getString('tag') ?? undefined;
    const url = `/guilds/${guild.id}/quotes/random${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`;
    const result = await apiGet<{ success: boolean; data: { content: string; author: string; tags: string[] } }>(url);

    if (!result.success) {
      await interaction.editReply('❌ No quotes found.');
      return;
    }

    const quote = result.data;
    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setDescription(`"${quote.content}"`)
      .setFooter({ text: `— ${quote.author}${quote.tags.length ? ` · ${quote.tags.join(', ')}` : ''}` });
    await interaction.editReply({ embeds: [embed] });

  } else if (sub === 'list') {
    await interaction.deferReply({ ephemeral: true });
    const result = await apiGet<{ success: boolean; data: { items: Array<{ id: string; content: string; author: string }> } }>(`/guilds/${guild.id}/quotes?pageSize=10`);

    if (!result.success) {
      await interaction.editReply('❌ Failed to load quotes.');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle('Recent Quotes')
      .setDescription(result.data.items.map((q, i) => `${i + 1}. "${q.content.slice(0, 80)}" — *${q.author}*`).join('\n') || 'No quotes yet.');
    await interaction.editReply({ embeds: [embed] });
  }
};

export default { data, execute } satisfies Command;
