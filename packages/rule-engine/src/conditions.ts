// =============================================
// Rule Engine - Condition Evaluators
// =============================================

import type { RuleCondition, RuleContext } from '@lunaria/types';

type ConditionEvaluator = (condition: RuleCondition, ctx: RuleContext) => boolean;

/** Returns true if the message content includes the keyword */
const keywordEvaluator: ConditionEvaluator = (cond, ctx) => {
  const keyword = cond.config['keyword'] as string | undefined;
  if (!keyword || !ctx.content) return false;
  return ctx.content.toLowerCase().includes(keyword.toLowerCase());
};

/** Returns true if the message content matches the regex */
const regexEvaluator: ConditionEvaluator = (cond, ctx) => {
  const pattern = cond.config['pattern'] as string | undefined;
  if (!pattern || !ctx.content) return false;
  try {
    const flags = (cond.config['flags'] as string | undefined) ?? 'i';
    return new RegExp(pattern, flags).test(ctx.content);
  } catch {
    return false;
  }
};

/** Returns true if the event channel is in the allowed list */
const channelFilterEvaluator: ConditionEvaluator = (cond, ctx) => {
  const channelIds = cond.config['channelIds'] as string[] | undefined;
  if (!channelIds?.length) return true; // no filter = allow all
  return ctx.channelId ? channelIds.includes(ctx.channelId) : false;
};

/** Returns true if the user has one of the allowed roles */
const roleFilterEvaluator: ConditionEvaluator = (cond, ctx) => {
  const roleIds = cond.config['roleIds'] as string[] | undefined;
  if (!roleIds?.length) return true;
  return ctx.roles ? ctx.roles.some((r) => roleIds.includes(r)) : false;
};

/** Returns true only if the event actor is not a bot */
const botExcludeEvaluator: ConditionEvaluator = (_cond, ctx) => {
  const isBot = ctx.eventData['isBot'] as boolean | undefined;
  return !isBot;
};

/** Returns true if current UTC hour is within the allowed window */
const timeWindowEvaluator: ConditionEvaluator = (cond, _ctx) => {
  const startHour = cond.config['startHour'] as number | undefined;
  const endHour = cond.config['endHour'] as number | undefined;
  if (startHour === undefined || endHour === undefined) return true;
  const nowHour = new Date().getUTCHours();
  if (startHour <= endHour) return nowHour >= startHour && nowHour < endHour;
  // Wrap around midnight
  return nowHour >= startHour || nowHour < endHour;
};

/** Returns true if today is one of the allowed weekdays (0=Sun..6=Sat) */
const weekdayEvaluator: ConditionEvaluator = (cond) => {
  const days = cond.config['days'] as number[] | undefined;
  if (!days?.length) return true;
  return days.includes(new Date().getUTCDay());
};

/** Returns true if the actor's user ID is in the allowed list */
const userIdEvaluator: ConditionEvaluator = (cond, ctx) => {
  const userIds = cond.config['userIds'] as string[] | undefined;
  if (!userIds?.length) return true;
  return ctx.userId ? userIds.includes(ctx.userId) : false;
};

/** Placeholder: message count threshold condition (requires external state) */
const messageCountThresholdEvaluator: ConditionEvaluator = (_cond, _ctx) => {
  // TODO: implement with Redis-backed sliding window counter
  return true;
};

const EVALUATORS: Record<string, ConditionEvaluator> = {
  keyword: keywordEvaluator,
  regex: regexEvaluator,
  channel_filter: channelFilterEvaluator,
  role_filter: roleFilterEvaluator,
  bot_exclude: botExcludeEvaluator,
  time_window: timeWindowEvaluator,
  weekday: weekdayEvaluator,
  user_id: userIdEvaluator,
  message_count_threshold: messageCountThresholdEvaluator,
};

/** Evaluate all conditions for a rule. Returns true only if ALL conditions pass. */
export function evaluateConditions(
  conditions: RuleCondition[],
  ctx: RuleContext,
): boolean {
  if (!conditions.length) return true;
  return conditions.every((cond) => {
    const evaluator = EVALUATORS[cond.type];
    if (!evaluator) return false;
    return evaluator(cond, ctx);
  });
}
