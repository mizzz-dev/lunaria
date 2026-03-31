// =============================================
// Scheduler - cron-based job dispatcher
// Runs in-process with the worker
// =============================================

import { prisma } from '@lunaria/db';
import { dailyContentQueue, reminderQueue, analyticsQueue } from './queues/index.js';

/** Simple cron match: check if current UTC time matches expression (minute-level) */
function cronMatches(cronExpr: string, now: Date): boolean {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [min, hour, dom, , dow] = parts;

  const m = now.getUTCMinutes();
  const h = now.getUTCHours();
  const d = now.getUTCDate();
  const wd = now.getUTCDay();

  const matches = (field: string | undefined, val: number): boolean => {
    if (!field || field === '*') return true;
    if (field.startsWith('*/')) { const step = parseInt(field.slice(2)); return !isNaN(step) && val % step === 0; }
    const n = parseInt(field);
    return !isNaN(n) && n === val;
  };

  return matches(min, m) && matches(hour, h) && matches(dom, d) && matches(dow, wd);
}

async function dispatchDailyContent(): Promise<void> {
  const now = new Date();
  const jobs = await prisma.dailyContentJob.findMany({ where: { enabled: true } });
  for (const job of jobs) {
    if (cronMatches(job.cronExpr, now)) {
      await dailyContentQueue.add('daily_content', { jobId: job.id, guildId: job.guildId, channelId: job.channelId }, { jobId: `dc-${job.id}-${now.toISOString().slice(0, 16)}` });
    }
  }
}

async function dispatchReminders(): Promise<void> {
  const due = await prisma.reminder.findMany({ where: { sent: false, remindAt: { lte: new Date() } }, take: 100 });
  for (const r of due) {
    await reminderQueue.add('reminder', { reminderId: r.id, userId: r.userId, guildId: r.guildId, channelId: r.channelId, content: r.content }, { jobId: `rem-${r.id}` });
  }
}

async function dispatchAnalytics(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().slice(0, 10);

  const guilds = await prisma.guild.findMany({ where: { active: true }, select: { id: true } });
  for (const guild of guilds) {
    await analyticsQueue.add('analytics_aggregate', { guildId: guild.id, date: dateStr }, { jobId: `ana-${guild.id}-${dateStr}` });
  }
}

let minuteInterval: ReturnType<typeof setInterval> | null = null;
let hourInterval: ReturnType<typeof setInterval> | null = null;

export function startScheduler(): void {
  // Every minute: check cron jobs + reminders
  minuteInterval = setInterval(() => {
    dispatchDailyContent().catch(console.error);
    dispatchReminders().catch(console.error);
  }, 60_000);

  // Every hour: analytics
  hourInterval = setInterval(() => {
    dispatchAnalytics().catch(console.error);
  }, 3_600_000);

  console.log('[scheduler] Started');
}

export function stopScheduler(): void {
  if (minuteInterval) clearInterval(minuteInterval);
  if (hourInterval) clearInterval(hourInterval);
  console.log('[scheduler] Stopped');
}
