import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types.js';
import { prisma } from '@lunaria/db';

const CONSENT_TYPES = ['voice_recording', 'data_analytics', 'ai_moderation'] as const;
type ConsentType = typeof CONSENT_TYPES[number];

const CONSENT_LABELS: Record<ConsentType, string> = {
  voice_recording: '音声録音',
  data_analytics: 'データ分析',
  ai_moderation: 'AI モデレーション',
};

const CONSENT_DESCRIPTIONS: Record<ConsentType, string> = {
  voice_recording: 'ボイスチャンネルでの発言が録音・保存される場合があります。',
  data_analytics: 'メッセージ数・活動パターン等の匿名統計データが収集されます。',
  ai_moderation: '投稿内容が AI によるモデレーション判定に使用される場合があります。',
};

export const data = new SlashCommandBuilder()
  .setName('consent')
  .setDescription('データ利用への同意を管理します')
  .addSubcommand((sub) =>
    sub.setName('show').setDescription('現在の同意状況を確認します'),
  )
  .addSubcommand((sub) =>
    sub
      .setName('grant')
      .setDescription('同意します')
      .addStringOption((o) =>
        o
          .setName('type')
          .setDescription('同意の種類')
          .setRequired(true)
          .addChoices(...CONSENT_TYPES.map((t) => ({ name: CONSENT_LABELS[t], value: t }))),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('revoke')
      .setDescription('同意を取り消します')
      .addStringOption((o) =>
        o
          .setName('type')
          .setDescription('同意の種類')
          .setRequired(true)
          .addChoices(...CONSENT_TYPES.map((t) => ({ name: CONSENT_LABELS[t], value: t }))),
      ),
  );

export const execute: Command['execute'] = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ ephemeral: true });

  const user = await prisma.user.upsert({
    where: { discordId: interaction.user.id },
    create: { discordId: interaction.user.id, username: interaction.user.username },
    update: {},
  });

  const guildId = interaction.guildId
    ? (await prisma.guild.findUnique({ where: { discordId: interaction.guildId } }))?.id ?? null
    : null;

  const sub = interaction.options.getSubcommand();

  if (sub === 'show') {
    const records = await prisma.consentRecord.findMany({
      where: { userId: user.id, ...(guildId ? { guildId } : {}) },
    });
    const recordMap = new Map(records.map((r) => [r.consentType, r]));

    const embed = new EmbedBuilder()
      .setColor(0x6366f1)
      .setTitle('🔐 データ利用同意状況')
      .setDescription(
        CONSENT_TYPES.map((t) => {
          const rec = recordMap.get(t);
          const status = rec?.granted ? '✅ 同意済み' : '❌ 未同意';
          return `**${CONSENT_LABELS[t]}**\n${status} — ${CONSENT_DESCRIPTIONS[t]}`;
        }).join('\n\n'),
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (sub === 'grant') {
    const type = interaction.options.getString('type', true) as ConsentType;

    const existing = await prisma.consentRecord.findFirst({
      where: { userId: user.id, consentType: type, guildId: guildId ?? '' },
      orderBy: { grantedAt: 'desc' },
    });
    if (existing) {
      await prisma.consentRecord.update({
        where: { id: existing.id },
        data: { granted: true, grantedAt: new Date(), revokedAt: null },
      });
    } else {
      await prisma.consentRecord.create({
        data: { userId: user.id, consentType: type, guildId: guildId ?? '', granted: true, grantedAt: new Date() },
      });
    }

    await interaction.editReply(`✅ **${CONSENT_LABELS[type]}** への同意を記録しました。`);
    return;
  }

  if (sub === 'revoke') {
    const type = interaction.options.getString('type', true) as ConsentType;

    const existing = await prisma.consentRecord.findFirst({
      where: { userId: user.id, consentType: type, guildId: guildId ?? '' },
      orderBy: { grantedAt: 'desc' },
    });
    if (existing) {
      await prisma.consentRecord.update({
        where: { id: existing.id },
        data: { granted: false, revokedAt: new Date() },
      });
    } else {
      await prisma.consentRecord.create({
        data: { userId: user.id, consentType: type, guildId: guildId ?? '', granted: false, revokedAt: new Date() },
      });
    }

    await interaction.editReply(`✅ **${CONSENT_LABELS[type]}** への同意を取り消しました。`);
  }
};

export default { data, execute } satisfies Command;
