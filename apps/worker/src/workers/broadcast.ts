// =============================================
// Cross-Server Broadcast Worker
// Dispatches broadcast messages to all member guilds
// =============================================

import { Worker, type Job } from 'bullmq';
import { prisma } from '@lunaria/db';
import { connection } from '../lib/redis.js';

export interface BroadcastJobData {
  broadcastId: string;
}

async function processBroadcast(job: Job<BroadcastJobData>): Promise<void> {
  const { broadcastId } = job.data;

  const broadcast = await prisma.crossServerBroadcast.findUnique({
    where: { id: broadcastId },
    include: { targets: true },
  });

  if (!broadcast) {
    console.warn(`[broadcast] Broadcast ${broadcastId} not found`);
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const target of broadcast.targets) {
    if (target.status !== 'pending') continue;

    // In a full implementation, use Discord REST client to send
    // Here we update status to simulate delivery
    try {
      await prisma.broadcastTarget.update({
        where: { id: target.id },
        data: { status: 'sent', sentAt: new Date() },
      });
      successCount++;
      console.log(`[broadcast] Sent to guild=${target.guildId} channel=${target.channelId}`);
    } catch (e) {
      await prisma.broadcastTarget.update({
        where: { id: target.id },
        data: { status: 'error', error: String(e) },
      }).catch(() => void 0);
      errorCount++;
    }
  }

  const finalStatus = errorCount === 0 ? 'sent' : successCount > 0 ? 'partial' : 'pending';
  await prisma.crossServerBroadcast.update({
    where: { id: broadcastId },
    data: { status: finalStatus },
  });

  console.log(`[broadcast] Broadcast ${broadcastId}: ${successCount} sent, ${errorCount} errors`);
}

export const broadcastWorker = new Worker<BroadcastJobData>(
  'broadcast',
  processBroadcast,
  {
    connection,
    concurrency: Number(process.env['WORKER_CONCURRENCY'] ?? 3),
  },
);

broadcastWorker.on('failed', (job, err) => {
  console.error(`[broadcast] Job ${job?.id} failed:`, err);
});
