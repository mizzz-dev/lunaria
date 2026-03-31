import { z } from 'zod';

export const ReminderCreateSchema = z.object({
  channelId: z.string().optional(),
  content: z.string().min(1).max(2000),
  remindAt: z.string().datetime(),
  recurrence: z.enum(['once', 'daily', 'weekly']).default('once'),
});

export const ReminderIdParamSchema = z.object({
  guildId: z.string().min(1),
  reminderId: z.string().min(1),
});
