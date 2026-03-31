import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Botの応答速度を確認します');

export const execute: Command['execute'] = async (interaction: ChatInputCommandInteraction) => {
  const sent = await interaction.reply({ content: '🏓 計測中...', fetchReply: true });
  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  const wsLatency = interaction.client.ws.ping;

  const embed = new EmbedBuilder()
    .setColor(0x6366f1)
    .setTitle('🏓 Pong!')
    .addFields(
      { name: 'レイテンシ', value: `${latency}ms`, inline: true },
      { name: 'WebSocket', value: `${wsLatency}ms`, inline: true },
    )
    .setTimestamp();

  await interaction.editReply({ content: '', embeds: [embed] });
};

export default { data, execute } satisfies Command;
