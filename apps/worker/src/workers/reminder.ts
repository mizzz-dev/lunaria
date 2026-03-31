import { Worker } from 'bullmq';
import { connection } from '../lib/redis.js';
import { prisma } from '@lunaria/db';
import type { ReminderJobPayload } from '@lunaria/types';
import { fetch } from 'undici';

const DISCORD_API = 'https://discord.com/api/v10';
const BOT_TOKEN = () => { const t = process.env['DISCORD_BOT_TOKEN']; if (!t) throw new Error('DISCORD_BOT_TOKEN required'); return t; };

async function sendToChannel(channelId: string, content: string): Promise<boolean> {
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${BOT_TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return res.ok;
}

async function sendDm(discordUserId: string, content: string): Promise<boolean> {
  // Create DM channel
  const dmRes = await fetch(`${DISCORD_API}/users/@me/channels`, {
    method: 'POST',
    headers: { Authorization: `Bot ${BOT_TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient_id: discordUserId }),
  });
  if (!dmRes.ok) return false;
  const dm = await dmRes.json() as { id: string };
  return sendToChannel(dm.id, content);
}

export const reminderWorker = new Worker<ReminderJobPayload>(
  'reminder',
  async (job) => {
    const { reminderId, userId, channelId, content } = job.data;

    const reminder = await prisma.reminder.findUnique({ where: { id: reminderId } });
    if (!reminder || reminder.sent) return;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { discordId: true } });
    if (!user) return;

    const message = `⏰ **Reminder**\n\n${content}`;
    let sent = false;

    if (channelId) {
      sent = await sendToChannel(channelId, `<@${user.discordId}> ${message}`);
    }
    if (!sent) {
      sent = await sendDm(user.discordId, message);
    }

    await prisma.reminder.update({ where: { id: reminderId }, data: { sent: true, sentAt: new Date() } });

    // Handle recurrence
    if (reminder.recurrence !== 'once') {
      const next = new Date(reminder.remindAt);
      if (reminder.recurrence === 'daily') next.setDate(next.getDate() + 1);
      else if (reminder.recurrence === 'weekly') next.setDate(next.getDate() + 7);

      await prisma.reminder.create({
        data: { guildId: reminder.guildId, userId: reminder.userId, channelId: reminder.channelId, content: reminder.content, remindAt: next, recurrence: reminder.recurrence },
      });
    }
  },
  { connection, concurrency: 5 },
);

reminderWorker.on('failed', (job, err) => console.error(`[reminder] Job ${job?.id} failed:`, err));
