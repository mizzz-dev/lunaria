import { z } from 'zod';

export const ModerationRuleCreateSchema = z.object({
  name: z.string().min(1).max(100),
  enabled: z.boolean().default(true),
  ruleType: z.enum([
    'spam', 'banned_word', 'link_filter',
    'mention_spam', 'caps_abuse', 'duplicate_message',
  ]),
  config: z.record(z.unknown()).default({}),
  action: z.enum(['warn', 'mute', 'kick', 'ban', 'delete', 'log']).default('warn'),
  actionConfig: z.record(z.unknown()).default({}),
});

export const ModerationRuleUpdateSchema = ModerationRuleCreateSchema.partial();

export const ModerationRuleIdParamSchema = z.object({
  guildId: z.string().min(1),
  id: z.string().min(1),
});

export const ModerationActionCreateSchema = z.object({
  actionType: z.enum(['warn', 'mute', 'kick', 'ban', 'unban', 'unmute', 'delete_message', 'manual']),
  targetId: z.string().min(1),
  reason: z.string().max(1000).optional(),
  expiresAt: z.string().datetime().optional(),
});
