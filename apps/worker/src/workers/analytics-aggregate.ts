import { Worker } from 'bullmq';
import { connection } from '../lib/redis.js';
import { prisma } from '@lunaria/db';
import type { AnalyticsAggregateJobPayload } from '@lunaria/types';

export const analyticsWorker = new Worker<AnalyticsAggregateJobPayload>(
  'analytics_aggregate',
  async (job) => {
    const { guildId, date } = job.data;
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const [messageCount, memberJoins, memberLeaves, moderationActions, pollsCreated, eventsCreated, lfgPosts, commandsUsed] = await Promise.all([
      prisma.analyticsEvent.count({ where: { guildId, eventType: 'message', occurredAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.analyticsEvent.count({ where: { guildId, eventType: 'member_join', occurredAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.analyticsEvent.count({ where: { guildId, eventType: 'member_leave', occurredAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.moderationAction.count({ where: { guildId, createdAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.poll.count({ where: { guildId, createdAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.event.count({ where: { guildId, createdAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.lfgPost.count({ where: { guildId, createdAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.analyticsEvent.count({ where: { guildId, eventType: 'command_used', occurredAt: { gte: dayStart, lte: dayEnd } } }),
    ]);

    const metrics = { messageCount, memberJoins, memberLeaves, moderationActions, pollsCreated, eventsCreated, lfgPosts, commandsUsed };

    await prisma.analyticsDaily.upsert({
      where: { guildId_date: { guildId, date: dayStart } },
      create: { guildId, date: dayStart, metrics },
      update: { metrics },
    });

    console.log(`[analytics] Aggregated ${date} for guild ${guildId}:`, metrics);
  },
  { connection, concurrency: 3 },
);

analyticsWorker.on('failed', (job, err) => console.error(`[analytics] Job ${job?.id} failed:`, err));
