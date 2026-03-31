import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { prisma } from '@lunaria/db';

export const data = new SlashCommandBuilder()
  .setName('settings')
  .setDescription('サーバー設定を表示・管理します')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub.setName('show').setDescription('現在の設定を表示します'),
  )
  .addSubcommand((sub) =>
    sub
      .setName('set')
      .setDescription('設定を変更します')
      .addStringOption((o) => o.setName('key').setDescription('設定キー').setRequired(true))
      .addStringOption((o) => o.setName('value').setDescription('設定値').setRequired(true)),
  );

export const execute: Command['execute'] = async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });

  const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
  if (!guild) {
    await interaction.editReply('❌ サーバーが登録されていません。');
    return;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === 'show') {
    const pluginCount = await prisma.guildPluginSetting.count({ where: { guildId: guild.id, enabled: true } });
    const ruleCount = await prisma.rule.count({ where: { guildId: guild.id, enabled: true } });

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle(`⚙️ ${guild.name} の設定`)
      .addFields(
        { name: '内部 ID', value: guild.id, inline: true },
        { name: '有効プラグイン', value: `${pluginCount} 個`, inline: true },
        { name: '有効ルール', value: `${ruleCount} 個`, inline: true },
        { name: 'Botオーナー', value: guild.ownerId, inline: false },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (sub === 'set') {
    const key = interaction.options.getString('key', true);
    const value = interaction.options.getString('value', true);

    const ALLOWED_KEYS = ['name'] as const;
    if (!(ALLOWED_KEYS as readonly string[]).includes(key)) {
      await interaction.editReply(`❌ 変更できる設定キーは次の通りです: ${ALLOWED_KEYS.join(', ')}`);
      return;
    }

    await prisma.guild.update({ where: { id: guild.id }, data: { [key]: value } });
    await interaction.editReply(`✅ \`${key}\` を \`${value}\` に変更しました。`);
  }
};

export default { data, execute } satisfies Command;
