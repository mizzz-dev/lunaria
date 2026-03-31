// =============================================
// @lunaria/plugin-sdk - Plugin interface and registry
// =============================================

import type { RbacPermissionKey } from '@lunaria/types';

export interface PluginConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    required?: boolean;
    default?: unknown;
  };
}

export interface PluginDefinition {
  /** Unique machine-readable key, e.g. "quote", "auto_response" */
  pluginKey: string;
  name: string;
  description: string;
  version: string;
  /** JSON Schema describing the guild-scoped config */
  configSchema: PluginConfigSchema;
  /** Event names emitted to audit log by this plugin */
  auditEvents: string[];
  /** Billing tier required to use this plugin */
  billingTier: 'free' | 'pro' | 'enterprise';
  /** Other plugin keys this plugin depends on */
  dependencies: string[];
  /** Permissions this plugin uses */
  permissions: RbacPermissionKey[];
  /** Whether this plugin is a stub (not yet production-ready) */
  isStub?: boolean;
  /** Short text shown on stub plugins */
  stubNote?: string;
}

/** Validate a guild plugin config against its schema (basic type checks) */
export function validatePluginConfig(
  config: Record<string, unknown>,
  schema: PluginConfigSchema,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [key, def] of Object.entries(schema)) {
    const val = config[key];
    if (def.required && (val === undefined || val === null)) {
      errors.push(`Missing required field: ${key}`);
      continue;
    }
    if (val !== undefined && val !== null) {
      if (def.type === 'string' && typeof val !== 'string') {
        errors.push(`Field ${key} must be a string`);
      } else if (def.type === 'number' && typeof val !== 'number') {
        errors.push(`Field ${key} must be a number`);
      } else if (def.type === 'boolean' && typeof val !== 'boolean') {
        errors.push(`Field ${key} must be a boolean`);
      } else if (def.type === 'array' && !Array.isArray(val)) {
        errors.push(`Field ${key} must be an array`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---- Built-in plugin definitions ----

export const PLUGIN_DEFINITIONS: Record<string, PluginDefinition> = {
  quote: {
    pluginKey: 'quote',
    name: 'Quote',
    description: 'Save and recall memorable messages from your community.',
    version: '1.0.0',
    configSchema: {
      maxQuotesPerUser: { type: 'number', description: 'Max quotes per user (0 = unlimited)', default: 0 },
      allowAnonymous: { type: 'boolean', description: 'Allow quotes without author attribution', default: false },
    },
    auditEvents: ['quote.create', 'quote.delete', 'quote.report'],
    billingTier: 'free',
    dependencies: [],
    permissions: ['quote.view', 'quote.manage'],
  },
  daily_content: {
    pluginKey: 'daily_content',
    name: 'Daily Content',
    description: 'Automatically post scheduled content (quotes, tips, custom messages) to channels.',
    version: '1.0.0',
    configSchema: {
      defaultTimezone: { type: 'string', description: 'Default timezone for jobs', default: 'UTC' },
    },
    auditEvents: ['daily_content.job.create', 'daily_content.job.update', 'daily_content.job.delete'],
    billingTier: 'free',
    dependencies: [],
    permissions: ['daily_content.view', 'daily_content.manage'],
  },
  auto_response: {
    pluginKey: 'auto_response',
    name: 'Auto Response',
    description: 'Automatically respond to messages matching keywords or patterns.',
    version: '1.0.0',
    configSchema: {
      globalCooldownSec: { type: 'number', description: 'Global cooldown between auto-responses in seconds', default: 5 },
    },
    auditEvents: ['auto_response.create', 'auto_response.update', 'auto_response.delete'],
    billingTier: 'free',
    dependencies: [],
    permissions: ['auto_response.view', 'auto_response.manage'],
  },
  poll: {
    pluginKey: 'poll',
    name: 'Poll',
    description: 'Create and manage polls in your server.',
    version: '1.0.0',
    configSchema: {
      maxActivePollsPerChannel: { type: 'number', description: 'Max concurrent active polls per channel', default: 3 },
    },
    auditEvents: ['poll.create', 'poll.close', 'poll.delete'],
    billingTier: 'free',
    dependencies: [],
    permissions: ['poll.view', 'poll.manage'],
  },
  event: {
    pluginKey: 'event',
    name: 'Event',
    description: 'Schedule and manage community events.',
    version: '1.0.0',
    configSchema: {
      defaultReminderMinutes: { type: 'number', description: 'Minutes before event to send reminder', default: 60 },
    },
    auditEvents: ['event.create', 'event.cancel', 'event.delete'],
    billingTier: 'free',
    dependencies: [],
    permissions: ['event.view', 'event.manage'],
  },
  team_split: {
    pluginKey: 'team_split',
    name: 'Team Split',
    description: 'Randomly or strategically split members into teams.',
    version: '1.0.0',
    configSchema: {},
    auditEvents: ['team_split.create', 'team_split.dissolve'],
    billingTier: 'free',
    dependencies: [],
    permissions: ['team.view', 'team.manage'],
  },
  lfg: {
    pluginKey: 'lfg',
    name: 'LFG',
    description: 'Looking For Group — let members find other players for games.',
    version: '1.0.0',
    configSchema: {
      defaultExpiryHours: { type: 'number', description: 'Default LFG post expiry in hours', default: 24 },
      lfgChannelId: { type: 'string', description: 'Channel ID for LFG posts', default: '' },
    },
    auditEvents: ['lfg.create', 'lfg.close', 'lfg.delete'],
    billingTier: 'free',
    dependencies: [],
    permissions: ['lfg.view', 'lfg.manage'],
  },
  faq: {
    pluginKey: 'faq',
    name: 'FAQ / Knowledge Base',
    description: 'Maintain a searchable knowledge base for your community.',
    version: '1.0.0',
    configSchema: {
      maxArticles: { type: 'number', description: 'Max FAQ articles (0 = unlimited)', default: 0 },
    },
    auditEvents: ['faq.create', 'faq.update', 'faq.delete'],
    billingTier: 'free',
    dependencies: [],
    permissions: ['faq.view', 'faq.manage'],
  },
  reminder: {
    pluginKey: 'reminder',
    name: 'Reminder',
    description: 'Set timed reminders for yourself or channel announcements.',
    version: '1.0.0',
    configSchema: {
      maxRemindersPerUser: { type: 'number', description: 'Max active reminders per user', default: 10 },
    },
    auditEvents: ['reminder.create', 'reminder.delete'],
    billingTier: 'free',
    dependencies: [],
    permissions: ['reminder.view', 'reminder.manage'],
  },
  auto_moderation: {
    pluginKey: 'auto_moderation',
    name: 'Auto Moderation',
    description: 'Automatically moderate messages based on configurable rules.',
    version: '1.0.0',
    configSchema: {
      logChannelId: { type: 'string', description: 'Channel ID for moderation logs', default: '' },
      muteRoleId: { type: 'string', description: 'Role ID to assign when muting', default: '' },
    },
    auditEvents: ['moderation.rule.create', 'moderation.rule.update', 'moderation.action.create'],
    billingTier: 'free',
    dependencies: [],
    permissions: ['moderation.view', 'moderation.manage'],
  },
  analytics: {
    pluginKey: 'analytics',
    name: 'Analytics',
    description: 'Track server activity and generate insights.',
    version: '1.0.0',
    configSchema: {
      retentionDays: { type: 'number', description: 'Days to retain raw analytics events', default: 90 },
    },
    auditEvents: [],
    billingTier: 'free',
    dependencies: [],
    permissions: ['analytics.view'],
  },
  template: {
    pluginKey: 'template',
    name: 'Template Library',
    description: 'Apply pre-built templates to quickly configure rules, responses, and more.',
    version: '1.0.0',
    configSchema: {},
    auditEvents: ['template.apply'],
    billingTier: 'free',
    dependencies: [],
    permissions: ['template.view', 'template.manage'],
  },
  // ---- Stubs ----
  hoyolink: {
    pluginKey: 'hoyolink',
    name: 'HoYoverse Link',
    description: 'Link HoYoverse game accounts to Discord members.',
    version: '0.1.0',
    configSchema: {},
    auditEvents: ['hoyolink.link', 'hoyolink.unlink'],
    billingTier: 'pro',
    dependencies: [],
    permissions: [],
    isStub: true,
    stubNote: 'HoYoverse API integration is not yet production-ready. Only safe boundaries are exposed in this version.',
  },
  voice_consent: {
    pluginKey: 'voice_consent',
    name: 'Voice Record Consent',
    description: 'Manage explicit consent records for voice recording features.',
    version: '0.1.0',
    configSchema: {},
    auditEvents: ['consent.grant', 'consent.revoke'],
    billingTier: 'pro',
    dependencies: [],
    permissions: [],
    isStub: true,
    stubNote: 'Voice recording features are not yet production-ready. Only consent record management is available.',
  },
  external_server: {
    pluginKey: 'external_server',
    name: 'External Server Control',
    description: 'Manage external game servers (Minecraft, Valheim, etc.) from Discord.',
    version: '0.1.0',
    configSchema: {},
    auditEvents: ['external_server.action'],
    billingTier: 'enterprise',
    dependencies: [],
    permissions: [],
    isStub: true,
    stubNote: 'External server control is not yet production-ready. Only configuration interfaces are available.',
  },
};
