import { z } from 'zod';

export const PollCreateSchema = z.object({
  channelId: z.string().min(1),
  title: z.string().min(1).max(256),
  description: z.string().max(1024).optional(),
  voteType: z.enum(['single', 'multi']).default('single'),
  anonymous: z.boolean().default(false),
  endsAt: z.string().datetime().optional(),
  options: z.array(z.object({
    label: z.string().min(1).max(100),
    emoji: z.string().max(10).optional(),
  })).min(2).max(20),
});

export const PollIdParamSchema = z.object({
  guildId: z.string().min(1),
  pollId: z.string().min(1),
});
