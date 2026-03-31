import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { apiPost } from '../lib/api-client.js';
import { prisma } from '@lunaria/db';

export const data = new SlashCommandBuilder()
  .setName('rule')
  .setDescription('Rule engine management')
  .addSubcommand((sub) =>
    sub.setName('run-test').setDescription('Test a rule without executing actions')
      .addStringOption((o) => o.setName('rule_id').setDescription('Rule ID to test').setRequired(true))
      .addStringOption((o) => o.setName('context_json').setDescription('Context JSON (optional)').setRequired(false)),
  );

export const execute: Command['execute'] = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });

  const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
  if (!guild) { await interaction.editReply('❌ Server not registered.'); return; }

  const ruleId = interaction.options.getString('rule_id', true);
  const contextJson = interaction.options.getString('context_json');

  let context: Record<string, unknown> = {};
  if (contextJson) {
    try { context = JSON.parse(contextJson) as Record<string, unknown>; }
    catch { await interaction.editReply('❌ Invalid JSON in context_json.'); return; }
  }

  const result = await apiPost<{
    success: boolean;
    data: { conditionsMet: boolean; conditionResults: Array<{ type: string; passed: boolean }> };
  }>(
    `/guilds/${guild.id}/rules/${ruleId}/test`,
    { context },
  );

  if (!result.success) { await interaction.editReply('❌ Failed to test rule.'); return; }

  const { conditionsMet, conditionResults } = result.data;
  const embed = new EmbedBuilder()
    .setColor(conditionsMet ? 0x22c55e : 0xef4444)
    .setTitle(`Rule Test: ${conditionsMet ? '✅ Conditions Met' : '❌ Conditions Not Met'}`)
    .addFields(
      conditionResults.map((c) => ({ name: c.type, value: c.passed ? '✅ Pass' : '❌ Fail', inline: true })),
    )
    .setFooter({ text: `Rule ID: ${ruleId}` });

  await interaction.editReply({ embeds: [embed] });
};

export default { data, execute } satisfies Command;
