// =============================================
// @lunaria/types - Shared TypeScript types
// =============================================

// ---- Branded Snowflake string ----
export type Snowflake = string & { readonly __brand: 'Snowflake' };

// ---- Standard API envelope ----
export type ApiOk<T> = { success: true; data: T };
export type ApiError = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};
export type ApiResult<T> = ApiOk<T> | ApiError;

// ---- Pagination ----
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

// ---- Auth ----
export interface JwtPayload {
  userId: string;
  discordId: string;
  iat?: number;
  exp?: number;
}

export interface SessionUser {
  id: string;
  discordId: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  email: string | null;
}

// ---- Discord OAuth guilds (from Discord API) ----
export interface DiscordPartialGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

// ---- RBAC ----
export type RbacPermissionKey =
  | 'guild.view'
  | 'guild.manage'
  | 'plugin.view'
  | 'plugin.manage'
  | 'rule.view'
  | 'rule.manage'
  | 'quote.view'
  | 'quote.manage'
  | 'poll.view'
  | 'poll.manage'
  | 'event.view'
  | 'event.manage'
  | 'lfg.view'
  | 'lfg.manage'
  | 'team.view'
  | 'team.manage'
  | 'faq.view'
  | 'faq.manage'
  | 'reminder.view'
  | 'reminder.manage'
  | 'moderation.view'
  | 'moderation.manage'
  | 'audit.view'
  | 'config.view'
  | 'config.manage'
  | 'analytics.view'
  | 'rbac.view'
  | 'rbac.manage'
  | 'auto_response.view'
  | 'auto_response.manage'
  | 'daily_content.view'
  | 'daily_content.manage'
  | 'template.view'
  | 'template.manage';

export type SystemRoleName = 'owner' | 'admin' | 'moderator' | 'member';

// ---- Plugin ----
export interface PluginMeta {
  pluginKey: string;
  name: string;
  description: string;
  version: string;
  configSchema: Record<string, unknown>;
  auditEvents: string[];
  billingTier: 'free' | 'pro' | 'enterprise';
  dependencies: string[];
  permissions: RbacPermissionKey[];
}

export interface GuildPluginStatus {
  pluginKey: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  config: Record<string, unknown>;
  billingTier: 'free' | 'pro' | 'enterprise';
}

// ---- Rule Engine ----
export type TriggerType =
  | 'messageCreate'
  | 'memberJoin'
  | 'reactionAdd'
  | 'scheduled'
  | 'buttonClick'
  | 'slashCommandExecuted';

export type ConditionType =
  | 'keyword'
  | 'regex'
  | 'channel_filter'
  | 'role_filter'
  | 'bot_exclude'
  | 'time_window'
  | 'weekday'
  | 'user_id'
  | 'message_count_threshold';

export type ActionType =
  | 'reply'
  | 'reaction'
  | 'role_add'
  | 'role_remove'
  | 'faq_suggest'
  | 'reminder_create'
  | 'moderation_warn'
  | 'log_emit';

export interface RuleCondition {
  type: ConditionType;
  config: Record<string, unknown>;
}

export interface RuleAction {
  type: ActionType;
  config: Record<string, unknown>;
}

export interface RuleTriggerConfig {
  // For 'scheduled': cron expression
  cron?: string;
  timezone?: string;
  // For message/reaction etc: channelIds, etc
  [key: string]: unknown;
}

// ---- Rule Engine execution context ----
export interface RuleContext {
  guildId: string;
  trigger: TriggerType;
  // Raw Discord event data (serializable)
  eventData: Record<string, unknown>;
  // Resolved Discord info
  userId?: string;
  channelId?: string;
  messageId?: string;
  content?: string;
  roles?: string[];
}

export interface RuleExecutionResult {
  ruleId: string;
  status: 'success' | 'skipped' | 'error';
  actionsRan: string[];
  error?: string;
  durationMs: number;
}

// ---- Audit ----
export interface AuditLogEntry {
  id: string;
  guildId: string;
  actorId: string | null;
  actorType: 'user' | 'bot' | 'system';
  action: string;
  targetType: string | null;
  targetId: string | null;
  before: unknown;
  after: unknown;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ---- Config Version ----
export interface ConfigVersionEntry {
  id: string;
  guildId: string;
  scope: string;
  version: number;
  snapshot: unknown;
  changedBy: string;
  changeNote: string | null;
  createdAt: string;
}

// ---- Queue Job Types ----
export type QueueJobType =
  | 'daily_content'
  | 'reminder'
  | 'rule_scheduled'
  | 'analytics_aggregate'
  | 'moderation_expire';

export interface DailyContentJobPayload {
  jobId: string;
  guildId: string;
  channelId: string;
}

export interface ReminderJobPayload {
  reminderId: string;
  userId: string;
  guildId: string;
  channelId: string | null;
  content: string;
}

export interface ScheduledRuleJobPayload {
  ruleId: string;
  guildId: string;
}

export interface AnalyticsAggregateJobPayload {
  guildId: string;
  date: string; // YYYY-MM-DD
}

// ---- Error codes ----
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  PLUGIN_NOT_FOUND: 'PLUGIN_NOT_FOUND',
  PLUGIN_DISABLED: 'PLUGIN_DISABLED',
  RULE_NOT_FOUND: 'RULE_NOT_FOUND',
  GUILD_NOT_FOUND: 'GUILD_NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
