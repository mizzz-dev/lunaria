import { Worker } from 'bullmq';
import { connection } from '../lib/redis.js';
import { prisma, createAuditLog } from '@lunaria/db';
import type { DailyContentJobPayload } from '@lunaria/types';
import { fetch } from 'undici';

const DISCORD_API = 'https://discord.com/api/v10';

async function sendDiscordMessage(channelId: string, content: string): Promise<string | null> {
  const token = process.env['DISCORD_BOT_TOKEN'];
  if (!token) return null;

  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    console.error('[daily-content] Discord send failed:', res.status, await res.text());
    return null;
  }
  const data = await res.json() as { id: string };
  return data.id;
}

export const dailyContentWorker = new Worker<DailyContentJobPayload>(
  'daily_content',
  async (job) => {
    const { jobId, guildId, channelId } = job.data;

    const dbJob = await prisma.dailyContentJob.findUnique({ where: { id: jobId } });
    if (!dbJob || !dbJob.enabled) {
      await prisma.dailyContentRun.create({ data: { jobId, status: 'skipped' } });
      return;
    }

    let content = '';

    if (dbJob.contentType === 'quote') {
      const count = await prisma.quote.count({ where: { guildId, deleted: false, ...(dbJob.tags.length ? { tags: { hasSome: dbJob.tags } } : {}) } });
      if (count === 0) {
        await prisma.dailyContentRun.create({ data: { jobId, status: 'skipped', error: 'No quotes found' } });
        return;
      }
      const [quote] = await prisma.quote.findMany({ where: { guildId, deleted: false }, skip: Math.floor(Math.random() * count), take: 1 });
      if (!quote) { await prisma.dailyContentRun.create({ data: { jobId, status: 'skipped', error: 'Quote fetch failed' } }); return; }
      const template = dbJob.template ?? '💬 **Daily Quote**\n\n"{content}"\n— *{author}*';
      content = template.replace('{content}', quote.content).replace('{author}', quote.author);
    } else if (dbJob.contentType === 'custom' && dbJob.template) {
      content = dbJob.template;
    }

    if (!content) {
      await prisma.dailyContentRun.create({ data: { jobId, status: 'skipped', error: 'No content to send' } });
      return;
    }

    const messageId = await sendDiscordMessage(channelId, content);
    await prisma.dailyContentRun.create({ data: { jobId, status: messageId ? 'success' : 'error', messageId, error: messageId ? null : 'Failed to send message' } });
    await createAuditLog({ guildId, actorType: 'bot', action: 'daily_content.run', metadata: { jobId, messageId } });
  },
  { connection, concurrency: 3 },
);

dailyContentWorker.on('failed', (job, err) => {
  console.error(`[daily-content] Job ${job?.id} failed:`, err);
  if (job?.data.jobId) {
    prisma.dailyContentRun.create({ data: { jobId: job.data.jobId, status: 'error', error: String(err) } }).catch(console.error);
  }
});
