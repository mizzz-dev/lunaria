import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { prisma } from '@lunaria/db';

export const data = new SlashCommandBuilder()
  .setName('automod')
  .setDescription('Auto moderation tools')
  .addSubcommand((sub) =>
    sub.setName('test').setDescription('Test a message against active moderation rules')
      .addStringOption((o) => o.setName('message_content').setDescription('Message to test').setRequired(true)),
  );

export const execute: Command['execute'] = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });

  const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
  if (!guild) { await interaction.editReply('❌ Server not registered.'); return; }

  const content = interaction.options.getString('message_content', true);
  const modRules = await prisma.moderationRule.findMany({ where: { guildId: guild.id, enabled: true } });
  const autoResponses = await prisma.autoResponse.findMany({ where: { guildId: guild.id, enabled: true } });

  const triggered: string[] = [];

  for (const rule of modRules) {
    const cfg = rule.config as Record<string, unknown>;
    if (rule.ruleType === 'banned_word') {
      const words = (cfg['words'] as string[] | undefined) ?? [];
      if (words.some((w) => content.toLowerCase().includes(w.toLowerCase()))) {
        triggered.push(`🚫 Moderation Rule: **${rule.name}** (${rule.ruleType}) → Action: ${rule.action}`);
      }
    } else if (rule.ruleType === 'caps_abuse') {
      const threshold = (cfg['threshold'] as number | undefined) ?? 70;
      const caps = content.replace(/[^A-Za-z]/g, '');
      if (caps.length > 5) {
        const capsPercent = (caps.replace(/[a-z]/g, '').length / caps.length) * 100;
        if (capsPercent >= threshold) triggered.push(`🚫 Moderation Rule: **${rule.name}** (${rule.ruleType})`);
      }
    }
  }

  for (const ar of autoResponses) {
    const text = ar.caseSensitive ? content : content.toLowerCase();
    const pattern = ar.caseSensitive ? ar.pattern : ar.pattern.toLowerCase();
    let match = false;
    if (ar.matchType === 'keyword') match = text.includes(pattern);
    else if (ar.matchType === 'exact') match = text === pattern;
    else if (ar.matchType === 'startsWith') match = text.startsWith(pattern);
    else if (ar.matchType === 'regex') { try { match = new RegExp(ar.pattern).test(content); } catch { /* skip */ } }
    if (match) triggered.push(`💬 Auto Response: **${ar.name}** → ${ar.responseType}: "${ar.response.slice(0, 50)}"`);
  }

  const embed = new EmbedBuilder()
    .setColor(triggered.length > 0 ? 0xf59e0b : 0x22c55e)
    .setTitle(`🔍 Automod Test: ${triggered.length > 0 ? `${triggered.length} rule(s) triggered` : 'Clean'}`)
    .setDescription(triggered.length > 0 ? triggered.join('\n') : '✅ No rules triggered.')
    .addFields({ name: 'Message', value: `"${content.slice(0, 200)}"` });

  await interaction.editReply({ embeds: [embed] });
};

export default { data, execute } satisfies Command;
