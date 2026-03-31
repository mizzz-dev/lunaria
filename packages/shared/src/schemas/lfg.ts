import { z } from 'zod';

export const LfgCreateSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().max(1024).optional(),
  game: z.string().max(100).optional(),
  maxPlayers: z.number().int().positive().optional(),
  channelId: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const LfgUpdateSchema = LfgCreateSchema.partial();

export const LfgIdParamSchema = z.object({
  guildId: z.string().min(1),
  lfgId: z.string().min(1),
});

export const LfgEntryCreateSchema = z.object({
  note: z.string().max(200).optional(),
});
