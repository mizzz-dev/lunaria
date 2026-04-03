import { ChannelType, PermissionFlagsBits, type ButtonInteraction, type CacheType, type Interaction } from 'discord.js';
import { prisma } from '@lunaria/db';
import { commands } from '../client.js';

export const name = 'interactionCreate';
export const once = false;

export async function execute(interaction: Interaction): Promise<void> {
  // ── Slash commands ───────────────────────────────────────────────
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) {
      await interaction.reply({ content: '⚠️ Unknown command.', ephemeral: true });
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[bot] Command ${interaction.commandName} failed:`, error);
      const msg = { content: '❌ An error occurred while executing this command.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    }
    return;
  }

  // ── Button interactions ──────────────────────────────────────────
  if (interaction.isButton()) {
    if (!interaction.guild) return;

    // Ticket open button
    if (interaction.customId === 'lunaria:ticket:open') {
      await handleTicketOpen(interaction);
      return;
    }

    // Custom components (role toggles etc.)
    const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
    if (!guild) return;

    const component = await prisma.customComponent.findUnique({
      where: { guildId_customId: { guildId: guild.id, customId: interaction.customId } },
    });
    if (!component || !component.enabled) return;

    await handleCustomComponent(interaction, component);

    // Record interaction
    prisma.componentInteraction.create({
      data: { componentId: component.id, userId: interaction.user.id, guildId: guild.id },
    }).catch(() => void 0);
  }
}

// ── Ticket open handler ──────────────────────────────────────────────────────

async function handleTicketOpen(interaction: ButtonInteraction<CacheType>): Promise<void> {
  if (!interaction.guild) return;
  await interaction.deferReply({ ephemeral: true });

  const guild = await prisma.guild.findUnique({ where: { discordId: interaction.guild.id } });
  if (!guild) {
    await interaction.editReply('❌ サーバーが登録されていません。');
    return;
  }

  const config = await prisma.ticketConfig.findUnique({ where: { guildId: guild.id } });
  if (!config?.enabled) {
    await interaction.editReply('❌ チケットシステムが有効ではありません。');
    return;
  }

  // Check open ticket limit
  const openCount = await prisma.ticket.count({
    where: { guildId: guild.id, openedBy: interaction.user.id, status: { in: ['open', 'claimed'] } },
  });
  if (openCount >= config.maxOpenPerUser) {
    await interaction.editReply(`❌ 既に ${config.maxOpenPerUser} 件のチケットが開いています。`);
    return;
  }

  try {
    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: config.categoryId ?? undefined,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        ...config.supportRoleIds.map((roleId) => ({
          id: roleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages],
        })),
      ],
    });

    await prisma.ticket.create({
      data: {
        guildId: guild.id,
        configId: config.id,
        channelId: ticketChannel.id,
        openedBy: interaction.user.id,
      },
    });

    await ticketChannel.send(
      `👋 <@${interaction.user.id}> さん、チケットを作成しました。\n\n${config.welcomeMessage}`,
    );

    await interaction.editReply(`✅ チケットを作成しました: ${ticketChannel}`);
  } catch (e) {
    console.error('[bot] Ticket open failed:', e);
    await interaction.editReply('❌ チケットの作成に失敗しました。');
  }
}

// ── Custom component handler ─────────────────────────────────────────────────

type CustomComponentRecord = Awaited<ReturnType<typeof prisma.customComponent.findUnique>> & {};

async function handleCustomComponent(
  interaction: ButtonInteraction<CacheType>,
  component: NonNullable<CustomComponentRecord>,
): Promise<void> {
  if (!interaction.guild) return;

  const config = component.actionConfig as Record<string, unknown>;

  if (component.actionType === 'reply') {
    const content = (config['content'] as string | undefined) ?? '✅ アクションを実行しました。';
    await interaction.reply({ content, ephemeral: true });
    return;
  }

  const roleId = config['roleId'] as string | undefined;
  if (!roleId) {
    await interaction.reply({ content: '⚠️ ロール設定が不正です。', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member) {
    await interaction.editReply('❌ メンバー情報を取得できませんでした。');
    return;
  }

  try {
    const hasRole = member.roles.cache.has(roleId);

    if (component.actionType === 'role_add' || (component.actionType === 'role_toggle' && !hasRole)) {
      await member.roles.add(roleId);
      await interaction.editReply(`✅ ロールを付与しました。`);
    } else if (component.actionType === 'role_remove' || (component.actionType === 'role_toggle' && hasRole)) {
      await member.roles.remove(roleId);
      await interaction.editReply(`✅ ロールを削除しました。`);
    }
  } catch (e) {
    console.error('[bot] Custom component role action failed:', e);
    await interaction.editReply('❌ ロール操作に失敗しました。');
  }
}
