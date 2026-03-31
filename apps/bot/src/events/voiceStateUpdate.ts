import { EmbedBuilder, ChannelType, PermissionFlagsBits, type VoiceState } from 'discord.js';
import { prisma } from '@lunaria/db';
import { client } from '../client.js';

export const name = 'voiceStateUpdate';
export const once = false;

export async function execute(oldState: VoiceState, newState: VoiceState): Promise<void> {
  const guildDiscordId = newState.guild.id ?? oldState.guild.id;
  const guild = await prisma.guild.findUnique({ where: { discordId: guildDiscordId } });
  if (!guild) return;

  const userId = newState.member?.id ?? oldState.member?.id;
  if (!userId) return;

  const joined = !oldState.channelId && !!newState.channelId;
  const left = !!oldState.channelId && !newState.channelId;
  const moved = !!oldState.channelId && !!newState.channelId && oldState.channelId !== newState.channelId;

  // ── Temp VC ─────────────────────────────────────────────────────
  const tempConfig = await prisma.tempVcConfig.findUnique({ where: { guildId: guild.id } });

  if (tempConfig?.enabled && tempConfig.triggerChannelId) {
    // User joined the trigger channel → create temp VC
    if (joined && newState.channelId === tempConfig.triggerChannelId) {
      const existingCount = await prisma.tempVoiceChannel.count({ where: { guildId: guild.id } });
      if (existingCount < tempConfig.maxChannels) {
        try {
          const memberName = newState.member?.displayName ?? 'User';
          const channelName = tempConfig.nameTemplate.replace('{user}', memberName);

          const tempChannel = await newState.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: tempConfig.categoryId ?? undefined,
            permissionOverwrites: [
              {
                id: userId,
                allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers],
              },
            ],
          });

          await prisma.tempVoiceChannel.create({
            data: {
              guildId: guild.id,
              configId: tempConfig.id,
              channelId: tempChannel.id,
              ownerId: userId,
            },
          });

          // Move user to new channel
          await newState.member?.voice.setChannel(tempChannel);
        } catch (e) {
          console.error('[bot] Failed to create temp VC:', e);
        }
      }
    }

    // User left a temp VC → delete if empty
    if ((left || moved) && oldState.channelId) {
      const tempRecord = await prisma.tempVoiceChannel.findUnique({
        where: { channelId: oldState.channelId },
      });
      if (tempRecord) {
        const channel = newState.guild.channels.cache.get(oldState.channelId);
        const memberCount = channel && 'members' in channel ? channel.members.size : 0;
        if (memberCount === 0) {
          try {
            await channel?.delete('Temp VC empty');
          } catch { /* already deleted */ }
          await prisma.tempVoiceChannel.delete({ where: { id: tempRecord.id } }).catch(() => void 0);
        }
      }
    }
  }

  // ── Voice Log ────────────────────────────────────────────────────
  const logConfig = await prisma.voiceLogConfig.findUnique({ where: { guildId: guild.id } });
  if (!logConfig?.enabled || !logConfig.channelId) return;

  let eventType: 'join' | 'leave' | 'move' | null = null;
  if (joined && logConfig.logJoin) eventType = 'join';
  else if (left && logConfig.logLeave) eventType = 'leave';
  else if (moved && logConfig.logMove) eventType = 'move';

  if (!eventType) return;

  // Record to DB (fire-and-forget)
  prisma.voiceLog.create({
    data: {
      guildId: guild.id,
      configId: logConfig.id,
      userId,
      channelId: newState.channelId ?? oldState.channelId ?? null,
      fromChannelId: moved ? oldState.channelId : null,
      eventType,
    },
  }).catch(() => void 0);

  // Post log embed
  try {
    const logChannel = await client.channels.fetch(logConfig.channelId);
    if (!logChannel?.isTextBased()) return;

    const member = newState.member ?? oldState.member;
    const color = eventType === 'join' ? 0x22c55e : eventType === 'leave' ? 0xef4444 : 0xf59e0b;
    const icon = eventType === 'join' ? '🔊' : eventType === 'leave' ? '🔇' : '🔄';
    const channelName = eventType === 'leave'
      ? (oldState.channel?.name ?? '不明')
      : (newState.channel?.name ?? '不明');

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: member?.displayName ?? userId, iconURL: member?.user.displayAvatarURL() })
      .setDescription(
        eventType === 'move'
          ? `${icon} **${oldState.channel?.name ?? '不明'}** → **${newState.channel?.name ?? '不明'}**`
          : `${icon} **${channelName}**`,
      )
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  } catch (e) {
    console.error('[bot] Voice log send failed:', e);
  }
}
