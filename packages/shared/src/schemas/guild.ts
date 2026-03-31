import { z } from 'zod';

export const GuildIdParamSchema = z.object({
  guildId: z.string().min(1),
});

export const GuildSettingsUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  // extensible
}).strict();
