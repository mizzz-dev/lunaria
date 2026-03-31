import { z } from 'zod';

export const AutoResponseCreateSchema = z.object({
  name: z.string().min(1).max(100),
  enabled: z.boolean().default(true),
  matchType: z.enum(['keyword', 'regex', 'startsWith', 'exact']).default('keyword'),
  pattern: z.string().min(1).max(500),
  responseType: z.enum(['reply', 'react', 'dm', 'thread_reply']).default('reply'),
  response: z.string().min(1).max(2000),
  channelIds: z.array(z.string()).default([]),
  triggerRoles: z.array(z.string()).default([]),
  ignoreBots: z.boolean().default(true),
  caseSensitive: z.boolean().default(false),
  cooldownSec: z.number().int().min(0).max(86400).default(0),
});

export const AutoResponseUpdateSchema = AutoResponseCreateSchema.partial();

export const AutoResponseIdParamSchema = z.object({
  guildId: z.string().min(1),
  id: z.string().min(1),
});
