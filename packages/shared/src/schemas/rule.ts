import { z } from 'zod';

const ConditionSchema = z.object({
  type: z.enum([
    'keyword', 'regex', 'channel_filter', 'role_filter',
    'bot_exclude', 'time_window', 'weekday', 'user_id',
    'message_count_threshold',
  ]),
  config: z.record(z.unknown()),
});

const ActionSchema = z.object({
  type: z.enum([
    'reply', 'reaction', 'role_add', 'role_remove',
    'faq_suggest', 'reminder_create', 'moderation_warn', 'log_emit',
  ]),
  config: z.record(z.unknown()),
});

export const RuleCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  enabled: z.boolean().default(true),
  trigger: z.enum([
    'messageCreate', 'memberJoin', 'reactionAdd',
    'scheduled', 'buttonClick', 'slashCommandExecuted',
  ]),
  triggerConfig: z.record(z.unknown()).default({}),
  conditions: z.array(ConditionSchema).default([]),
  actions: z.array(ActionSchema).min(1),
  priority: z.number().int().min(0).max(1000).default(0),
});

export const RuleUpdateSchema = RuleCreateSchema.partial();

export const RuleIdParamSchema = z.object({
  guildId: z.string().min(1),
  ruleId: z.string().min(1),
});

export const RuleTestSchema = z.object({
  context: z.record(z.unknown()),
});
