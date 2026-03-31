import { z } from 'zod';

export const DiscordCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
});

export const JwtPayloadSchema = z.object({
  userId: z.string(),
  discordId: z.string(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});
