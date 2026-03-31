import { Worker } from 'bullmq';
import { connection } from '../lib/redis.js';
import { prisma, createAuditLog } from '@lunaria/db';
import { fetch } from 'undici';

interface ModerationExpirePayload { actionId: string }

const DISCORD_API = 'https://discord.com/api/v10';
const BOT_TOKEN = () => process.env['DISCORD_BOT_TOKEN'] ?? '';

export const moderationExpireWorker = new Worker<ModerationExpirePayload>(
  'moderation_expire',
  async (job) => {
    const { actionId } = job.data;
    const action = await prisma.moderationAction.findUnique({ where: { id: actionId } });
    if (!action || action.reversed) return;

    const guild = await prisma.guild.findUnique({ where: { id: action.guildId } });
    if (!guild) return;

    // Remove timeout if it was a mute
    if (action.actionType === 'mute') {
      const res = await fetch(`${DISCORD_API}/guilds/${guild.discordId}/members/${action.targetId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bot ${BOT_TOKEN()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ communication_disabled_until: null }),
      });
      if (!res.ok) {
        console.error('[moderation-expire] Failed to remove timeout:', res.status);
      }
    }

    await prisma.moderationAction.update({ where: { id: actionId }, data: { reversed: true, reversedAt: new Date() } });
    await createAuditLog({ guildId: action.guildId, actorType: 'bot', action: 'moderation.action.expired', targetType: 'moderation_action', targetId: actionId });
  },
  { connection, concurrency: 3 },
);

moderationExpireWorker.on('failed', (job, err) => console.error(`[moderation-expire] Job ${job?.id} failed:`, err));
