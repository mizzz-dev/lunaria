import crypto from 'node:crypto';

// =============================================
// Lunaria Worker – Entry Point
// =============================================

const required = ['REDIS_URL', 'DATABASE_URL'] as const;
for (const key of required) {
  if (!process.env[key]) { console.error(JSON.stringify({ ts: new Date().toISOString(), service: 'worker', level: 'error', event: 'env.missing', key })); process.exit(1); }
}

import { dailyContentWorker } from './workers/daily-content.js';
import { reminderWorker } from './workers/reminder.js';
import { analyticsWorker } from './workers/analytics-aggregate.js';
import { moderationExpireWorker } from './workers/moderation-expire.js';
import { scheduledRuleWorker } from './workers/scheduled-rule.js';
import { startScheduler, stopScheduler } from './scheduler.js';

const correlationId = crypto.randomUUID();
console.log(JSON.stringify({ ts: new Date().toISOString(), service: 'worker', level: 'info', event: 'startup.begin', correlationId }));
console.log(JSON.stringify({ ts: new Date().toISOString(), service: 'worker', level: 'info', event: 'workers.registered', workers: ['daily_content', 'reminder', 'analytics_aggregate', 'moderation_expire', 'scheduled_rule'] }));

startScheduler();

async function shutdown(): Promise<void> {
  console.log(JSON.stringify({ ts: new Date().toISOString(), service: 'worker', level: 'info', event: 'shutdown.begin', correlationId }));
  stopScheduler();
  await Promise.all([
    dailyContentWorker.close(),
    reminderWorker.close(),
    analyticsWorker.close(),
    moderationExpireWorker.close(),
    scheduledRuleWorker.close(),
  ]);
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());

console.log(JSON.stringify({ ts: new Date().toISOString(), service: 'worker', level: 'info', event: 'startup.ready', correlationId }));
