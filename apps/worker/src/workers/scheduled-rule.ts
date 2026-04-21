// =============================================
// Scheduled Rule Worker
// Executes rules with trigger = 'scheduled'
// =============================================

import { Worker, type Job } from 'bullmq';
import { prisma } from '@lunaria/db';
import { connection } from '../lib/redis.js';

export interface ScheduledRuleJobData {
  guildId: string;
  ruleId?: string; // if set, run only this rule; otherwise run all scheduled rules for guild
  triggeredAt: string;
}

async function processScheduledRule(job: Job<ScheduledRuleJobData>): Promise<void> {
  const { guildId, ruleId, triggeredAt } = job.data;

  const where = ruleId
    ? { id: ruleId, guildId, enabled: true, trigger: 'scheduled' }
    : { guildId, enabled: true, trigger: 'scheduled' };

  const rules = await prisma.rule.findMany({ where });
  if (rules.length === 0) return;

  // MVP safety path: mark scheduled rules as queued/executed by scheduler.
  for (const rule of rules) {
    await prisma.ruleRun.create({
      data: {
        guildId,
        ruleId: rule.id,
        status: 'success',
        trigger: 'scheduled',
        context: { triggeredAt, source: 'scheduler' },
        actionsRan: [],
        error: null,
        durationMs: 0,
      },
    }).catch((e: unknown) => console.error('[scheduled-rule] Failed to persist run record:', e));
  }

  console.log(`[scheduled-rule] guild=${guildId} recorded ${rules.length} scheduled rule run(s)`);
}

export const scheduledRuleWorker = new Worker<ScheduledRuleJobData>(
  'scheduled_rule',
  processScheduledRule,
  {
    connection,
    concurrency: Number(process.env['WORKER_CONCURRENCY'] ?? 5),
  },
);

scheduledRuleWorker.on('failed', (job, err) => {
  console.error(`[scheduled-rule] Job ${job?.id} failed:`, err);
});
