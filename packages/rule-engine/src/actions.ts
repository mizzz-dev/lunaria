// =============================================
// Rule Engine - Action Executor
// =============================================

import type { RuleAction, RuleContext } from '@lunaria/types';

export interface ActionExecutionDeps {
  /** Send a reply/message to the trigger channel or a specified channel */
  sendMessage: (channelId: string, content: string) => Promise<void>;
  /** Add a reaction to a message */
  addReaction: (channelId: string, messageId: string, emoji: string) => Promise<void>;
  /** Add a role to a guild member */
  addRole: (guildId: string, userId: string, roleId: string) => Promise<void>;
  /** Remove a role from a guild member */
  removeRole: (guildId: string, userId: string, roleId: string) => Promise<void>;
  /** Create a reminder */
  createReminder: (userId: string, guildId: string, content: string, remindAt: Date) => Promise<void>;
  /** Issue a moderation warning */
  warnUser: (guildId: string, targetId: string, reason: string, moderatorId?: string) => Promise<void>;
  /** Emit a log entry */
  emitLog: (guildId: string, message: string, level: 'info' | 'warn' | 'error') => Promise<void>;
  /** Suggest a FAQ article */
  suggestFaq: (channelId: string, query: string) => Promise<void>;
}

type ActionHandler = (
  action: RuleAction,
  ctx: RuleContext,
  deps: ActionExecutionDeps,
) => Promise<void>;

const replyHandler: ActionHandler = async (action, ctx, deps) => {
  const content = action.config['content'] as string | undefined;
  const channelId = (action.config['channelId'] as string | undefined) ?? ctx.channelId;
  if (!content || !channelId) return;
  await deps.sendMessage(channelId, content);
};

const reactionHandler: ActionHandler = async (action, ctx, deps) => {
  const emoji = action.config['emoji'] as string | undefined;
  if (!emoji || !ctx.channelId || !ctx.messageId) return;
  await deps.addReaction(ctx.channelId, ctx.messageId, emoji);
};

const roleAddHandler: ActionHandler = async (action, ctx, deps) => {
  const roleId = action.config['roleId'] as string | undefined;
  if (!roleId || !ctx.userId) return;
  await deps.addRole(ctx.guildId, ctx.userId, roleId);
};

const roleRemoveHandler: ActionHandler = async (action, ctx, deps) => {
  const roleId = action.config['roleId'] as string | undefined;
  if (!roleId || !ctx.userId) return;
  await deps.removeRole(ctx.guildId, ctx.userId, roleId);
};

const faqSuggestHandler: ActionHandler = async (action, ctx, deps) => {
  const query = (action.config['query'] as string | undefined) ?? ctx.content ?? '';
  const channelId = (action.config['channelId'] as string | undefined) ?? ctx.channelId;
  if (!channelId) return;
  await deps.suggestFaq(channelId, query);
};

const reminderCreateHandler: ActionHandler = async (action, ctx, deps) => {
  const content = action.config['content'] as string | undefined;
  const delayMinutes = (action.config['delayMinutes'] as number | undefined) ?? 60;
  if (!content || !ctx.userId) return;
  const remindAt = new Date(Date.now() + delayMinutes * 60 * 1000);
  await deps.createReminder(ctx.userId, ctx.guildId, content, remindAt);
};

const moderationWarnHandler: ActionHandler = async (action, ctx, deps) => {
  const reason = (action.config['reason'] as string | undefined) ?? 'Rule Engine: automatic warning';
  if (!ctx.userId) return;
  await deps.warnUser(ctx.guildId, ctx.userId, reason);
};

const logEmitHandler: ActionHandler = async (action, ctx, deps) => {
  const message = (action.config['message'] as string | undefined) ?? 'Rule triggered';
  const level = (action.config['level'] as 'info' | 'warn' | 'error' | undefined) ?? 'info';
  await deps.emitLog(ctx.guildId, message, level);
};

const ACTION_HANDLERS: Record<string, ActionHandler> = {
  reply: replyHandler,
  reaction: reactionHandler,
  role_add: roleAddHandler,
  role_remove: roleRemoveHandler,
  faq_suggest: faqSuggestHandler,
  reminder_create: reminderCreateHandler,
  moderation_warn: moderationWarnHandler,
  log_emit: logEmitHandler,
};

export interface ActionExecutionResult {
  type: string;
  success: boolean;
  error?: string;
}

/** Execute all rule actions and return results */
export async function executeActions(
  actions: RuleAction[],
  ctx: RuleContext,
  deps: ActionExecutionDeps,
): Promise<ActionExecutionResult[]> {
  const results: ActionExecutionResult[] = [];

  for (const action of actions) {
    const handler = ACTION_HANDLERS[action.type];
    if (!handler) {
      results.push({ type: action.type, success: false, error: 'Unknown action type' });
      continue;
    }
    try {
      await handler(action, ctx, deps);
      results.push({ type: action.type, success: true });
    } catch (err) {
      results.push({
        type: action.type,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
