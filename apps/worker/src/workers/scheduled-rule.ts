// =============================================
// Scheduled Rule Worker
// Executes rules with trigger = 'scheduled'
// =============================================

import { Worker, type Job } from 'bullmq';
import { prisma } from '@lunaria/db';
import { connection } from '../lib/redis.js';
import type { RuleRecord } from '@lunaria/rule-engine';
import { executeRulesForTrigger } from '@lunaria/rule-engine';
import type { RuleCondition, RuleAction, RuleContext } from '@lunaria/types';

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

  const ruleRecords: RuleRecord[] = rules.map((r) => ({
    id: r.id,
    trigger: r.trigger,
    conditions: r.conditions as unknown as RuleCondition[],
    actions: r.actions as unknown as RuleAction[],
    priority: r.priority,
    enabled: r.enabled,
  }));

  const ctx: RuleContext = {
    guildId,
    trigger: 'scheduled',
    eventData: { triggeredAt, source: 'scheduler' },
  };

  // Build minimal deps (no Discord client in worker — log-only actions)
  const deps = {
    sendMessage: async () => { /* no Discord client in worker */ },
    addReaction: async () => { /* no Discord client in worker */ },
    addRole: async () => { /* no Discord client in worker */ },
    removeRole: async () => { /* no Discord client in worker */ },
    createReminder: async (userId: string, gid: string, content: string, remindAt: Date) => {
      const user = await prisma.user.findUnique({ where: { discordId: userId } });
      if (!user) return;
      await prisma.reminder.create({ data: { guildId: gid, userId: user.id, content, remindAt } });
    },
    warnUser: async () => { /* no Discord client in worker */ },
    emitLog: async (gid: string, message: string, level: string) => {
      console.log(`[scheduled-rule] [${level}] guild=${gid} ${message}`);
    },
    suggestFaq: async () => { /* no Discord client in worker */ },
  };

  const results = await executeRulesForTrigger(ruleRecords, ctx, deps);

  // Persist run records
  for (const result of results) {
    if (result.status !== 'skipped') {
      await prisma.ruleRun.create({
        data: {
          guildId,
          ruleId: result.ruleId,
          status: result.status,
          trigger: 'scheduled',
          context: { triggeredAt, source: 'scheduler' },
          actionsRan: result.actionsRan,
          error: result.error ?? null,
          durationMs: result.durationMs,
        },
      }).catch((e) => console.error('[scheduled-rule] Failed to persist run record:', e));
    }
  }

  console.log(`[scheduled-rule] guild=${guildId} executed ${results.length} rule(s)`);
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
