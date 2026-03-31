import { z } from 'zod';

export const TeamSplitCreateSchema = z.object({
  name: z.string().min(1).max(100),
  splitMode: z.enum(['random', 'balanced', 'manual']).default('random'),
  teamCount: z.number().int().min(2).max(10).default(2),
  playerIds: z.array(z.string()).min(2),
});

export const TeamSetIdParamSchema = z.object({
  guildId: z.string().min(1),
  teamSetId: z.string().min(1),
});
