import { z } from 'zod';

export const DailyContentJobCreateSchema = z.object({
  name: z.string().min(1).max(100),
  enabled: z.boolean().default(true),
  channelId: z.string().min(1),
  contentType: z.enum(['quote', 'tip', 'custom']).default('quote'),
  cronExpr: z.string().min(1).max(100).default('0 9 * * *'),
  timezone: z.string().max(100).default('UTC'),
  template: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(10).default([]),
});

export const DailyContentJobUpdateSchema = DailyContentJobCreateSchema.partial();

export const DailyContentJobIdParamSchema = z.object({
  guildId: z.string().min(1),
  jobId: z.string().min(1),
});
