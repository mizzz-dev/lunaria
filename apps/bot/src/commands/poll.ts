import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { apiPost } from '../lib/api-client.js';
import { prisma } from '@lunaria/db';

export const data = new SlashCommandBuilder()
  .setName('poll')
  .setDescription('Create a poll')
  .addSubcommand((sub) =>
    sub.setName('create').setDescription('Create a new poll')
      .addStringOption((o) => o.setName('title').setDescription('Poll title').setRequired(true))
      .addStringOption((o) => o.setName('options').setDescription('Options separated by | (e.g. Yes|No|Maybe)').setRequired(true))
      .addStringOption((o) => o.setName('vote_type').setDescription('single or multi').addChoices({ name: 'Single choice', value: 'single' }, { name: 'Multi choice', value: 'multi' }))
      .addIntegerOption((o) => o.setName('duration_minutes').setDescription('Auto-close after N minutes').setMinValue(1)),
  );

export const execute: Command['execute'] = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.guild || !interaction.channel) return;
  await interaction.deferReply();

  const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
  if (!guild) { await interaction.editReply('❌ Server not registered.'); return; }

  const title = interaction.options.getString('title', true);
  const optionsStr = interaction.options.getString('options', true);
  const voteType = interaction.options.getString('vote_type') ?? 'single';
  const durationMinutes = interaction.options.getInteger('duration_minutes');
  const endsAt = durationMinutes ? new Date(Date.now() + durationMinutes * 60000).toISOString() : undefined;

  const options = optionsStr.split('|').map((o) => o.trim()).filter(Boolean).map((label) => ({ label }));
  if (options.length < 2) { await interaction.editReply('❌ Please provide at least 2 options separated by |'); return; }

  const result = await apiPost<{ success: boolean; data: { id: string } }>(
    `/guilds/${guild.id}/polls`,
    { channelId: interaction.channel.id, title, options, voteType, endsAt },
  );

  if (!result.success) { await interaction.editReply('❌ Failed to create poll.'); return; }

  const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  const embed = new EmbedBuilder()
    .setColor(0x6366f1)
    .setTitle(`📊 ${title}`)
    .setDescription(options.map((o, i) => `${numberEmojis[i] ?? `${i + 1}.`} ${o.label}`).join('\n'))
    .setFooter({ text: `Poll ID: ${result.data.id}${endsAt ? ` · Closes in ${durationMinutes}m` : ''}` });

  const msg = await interaction.editReply({ embeds: [embed] });
  for (let i = 0; i < options.length && i < 10; i++) {
    await msg.react(numberEmojis[i] ?? '✅');
  }
};

export default { data, execute } satisfies Command;
