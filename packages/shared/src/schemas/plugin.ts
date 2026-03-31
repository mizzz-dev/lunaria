import { z } from 'zod';

export const PluginKeyParamSchema = z.object({
  guildId: z.string().min(1),
  pluginKey: z.string().min(1),
});

export const PluginConfigUpdateSchema = z.object({
  config: z.record(z.unknown()),
});
