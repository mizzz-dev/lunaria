export { prisma } from './client.js';
export { createAuditLog } from './audit.js';
export type { CreateAuditLogInput } from './audit.js';
export { saveConfigVersion, getConfigVersions } from './config-version.js';
export type { SaveConfigVersionInput } from './config-version.js';
export { hasPermission, getUserPermissions } from './rbac.js';

// Re-export Prisma types for convenience
export type {
  User,
  Guild,
  GuildMembership,
  Plugin,
  GuildPluginSetting,
  ConfigVersion,
  AuditLog,
  RbacRole,
  RbacPermission,
  Rule,
  RuleRun,
  AutoResponse,
  Quote,
  QuoteReport,
  DailyContentJob,
  DailyContentRun,
  Poll,
  PollOption,
  PollVote,
  Event,
  EventParticipant,
  LfgPost,
  LfgEntry,
  TeamSet,
  Team,
  TeamMember,
  FaqArticle,
  FaqFeedback,
  Reminder,
  ModerationRule,
  ModerationAction,
  AnalyticsEvent,
  AnalyticsDaily,
  Template,
  TemplateApplication,
  GameLink,
  ConsentRecord,
  ExternalServer,
  ExternalServerAction,
  Prisma,
} from '@prisma/client';
