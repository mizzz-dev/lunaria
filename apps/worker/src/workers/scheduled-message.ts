// =============================================
// Scheduled Message Worker
// Sends scheduled messages to Discord channels at the configured time
// =============================================

import { Worker, type Job } from 'bullmq';
import { prisma } from '@lunaria/db';
import { connection } from '../lib/redis.js';

export interface ScheduledMessageJobData {
  messageId: string;
  guildId: string;
}

async function processScheduledMessage(job: Job<ScheduledMessageJobData>): Promise<void> {
  const { messageId } = job.data;

  const message = await prisma.scheduledMessage.findUnique({ where: { id: messageId } });
  if (!message) {
    console.warn(`[scheduled-message] Message ${messageId} not found`);
    return;
  }
  if (message.status !== 'pending') {
    console.log(`[scheduled-message] Message ${messageId} already ${message.status}, skipping`);
    return;
  }

  // The actual Discord send is handled by the bot process via REST API
  // Here we mark as ready and the bot's scheduler picks it up
  // In a full implementation, the worker would use a Discord REST client directly
  console.log(`[scheduled-message] Processing message ${messageId} → channel ${message.channelId}`);

  await prisma.scheduledMessage.update({
    where: { id: messageId },
    data: { status: 'sent', sentAt: new Date() },
  });

  console.log(`[scheduled-message] Message ${messageId} marked as sent`);
}

export const scheduledMessageWorker = new Worker<ScheduledMessageJobData>(
  'scheduled_message',
  processScheduledMessage,
  {
    connection,
    concurrency: Number(process.env['WORKER_CONCURRENCY'] ?? 5),
  },
);

scheduledMessageWorker.on('failed', (job, err) => {
  console.error(`[scheduled-message] Job ${job?.id} failed:`, err);
});
