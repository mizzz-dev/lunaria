import { Queue } from 'bullmq';
import { connection } from '../lib/redis.js';

export const dailyContentQueue = new Queue('daily_content', { connection });
export const reminderQueue = new Queue('reminder', { connection });
export const scheduledRuleQueue = new Queue('scheduled_rule', { connection });
export const analyticsQueue = new Queue('analytics_aggregate', { connection });
export const moderationExpireQueue = new Queue('moderation_expire', { connection });
