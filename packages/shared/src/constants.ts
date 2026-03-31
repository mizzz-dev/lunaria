// =============================================
// Shared constants
// =============================================

export const SYSTEM_ROLE_PERMISSIONS = {
  owner: [
    'guild.view', 'guild.manage',
    'plugin.view', 'plugin.manage',
    'rule.view', 'rule.manage',
    'quote.view', 'quote.manage',
    'poll.view', 'poll.manage',
    'event.view', 'event.manage',
    'lfg.view', 'lfg.manage',
    'team.view', 'team.manage',
    'faq.view', 'faq.manage',
    'reminder.view', 'reminder.manage',
    'moderation.view', 'moderation.manage',
    'audit.view',
    'config.view', 'config.manage',
    'analytics.view',
    'rbac.view', 'rbac.manage',
    'auto_response.view', 'auto_response.manage',
    'daily_content.view', 'daily_content.manage',
    'template.view', 'template.manage',
  ],
  admin: [
    'guild.view', 'guild.manage',
    'plugin.view', 'plugin.manage',
    'rule.view', 'rule.manage',
    'quote.view', 'quote.manage',
    'poll.view', 'poll.manage',
    'event.view', 'event.manage',
    'lfg.view', 'lfg.manage',
    'team.view', 'team.manage',
    'faq.view', 'faq.manage',
    'reminder.view', 'reminder.manage',
    'moderation.view', 'moderation.manage',
    'audit.view',
    'config.view', 'config.manage',
    'analytics.view',
    'rbac.view',
    'auto_response.view', 'auto_response.manage',
    'daily_content.view', 'daily_content.manage',
    'template.view', 'template.manage',
  ],
  moderator: [
    'guild.view',
    'plugin.view',
    'rule.view',
    'quote.view', 'quote.manage',
    'poll.view', 'poll.manage',
    'event.view', 'event.manage',
    'lfg.view', 'lfg.manage',
    'team.view', 'team.manage',
    'faq.view', 'faq.manage',
    'reminder.view',
    'moderation.view', 'moderation.manage',
    'audit.view',
    'config.view',
    'analytics.view',
    'auto_response.view',
    'daily_content.view',
    'template.view',
  ],
  member: [
    'guild.view',
    'quote.view',
    'poll.view',
    'event.view',
    'lfg.view',
    'team.view',
    'faq.view',
    'reminder.view',
    'template.view',
  ],
} as const;

export const ALL_PLUGIN_KEYS = [
  'quote',
  'daily_content',
  'auto_response',
  'poll',
  'event',
  'team_split',
  'lfg',
  'faq',
  'reminder',
  'auto_moderation',
  'analytics',
  'template',
  // Stubs
  'hoyolink',
  'voice_consent',
  'external_server',
] as const;

export type PluginKey = (typeof ALL_PLUGIN_KEYS)[number];

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const DISCORD_PERMISSIONS = {
  ADMINISTRATOR: BigInt('8'),
  MANAGE_GUILD: BigInt('32'),
  MANAGE_ROLES: BigInt('268435456'),
  MANAGE_MESSAGES: BigInt('8192'),
  KICK_MEMBERS: BigInt('2'),
  BAN_MEMBERS: BigInt('4'),
  MODERATE_MEMBERS: BigInt('1099511627776'),
} as const;
