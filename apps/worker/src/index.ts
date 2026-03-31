// =============================================
// Lunaria Worker – Entry Point
// =============================================

const required = ['REDIS_URL', 'DATABASE_URL'] as const;
for (const key of required) {
  if (!process.env[key]) { console.error(`[worker] Missing env: ${key}`); process.exit(1); }
}

import { dailyContentWorker } from './workers/daily-content.js';
import { reminderWorker } from './workers/reminder.js';
import { analyticsWorker } from './workers/analytics-aggregate.js';
import { moderationExpireWorker } from './workers/moderation-expire.js';
import { startScheduler, stopScheduler } from './scheduler.js';

console.log('[worker] Starting Lunaria Worker...');
console.log('[worker] Workers: daily_content, reminder, analytics_aggregate, moderation_expire');

startScheduler();

async function shutdown(): Promise<void> {
  console.log('[worker] Shutting down...');
  stopScheduler();
  await Promise.all([
    dailyContentWorker.close(),
    reminderWorker.close(),
    analyticsWorker.close(),
    moderationExpireWorker.close(),
  ]);
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());

console.log('[worker] Ready.');
