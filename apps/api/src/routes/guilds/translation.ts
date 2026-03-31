import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog } from '@lunaria/db';
import { ok, err } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';
import { z } from 'zod';

const TranslationConfigSchema = z.object({
  enabled: z.boolean().optional(),
  triggerEmoji: z.string().min(1).max(10).optional(),
  defaultTargetLang: z.string().min(2).max(10).optional(),
  logChannelId: z.string().nullable().optional(),
});

export const translationRoutes: FastifyPluginAsync = async (app) => {
  // GET /:guildId/translation/config
  app.get<{ Params: { guildId: string } }>(
    '/:guildId/translation/config',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const config = await prisma.translationConfig.findUnique({ where: { guildId: guild.id } });
      return reply.send(ok(config ?? { guildId: guild.id, enabled: false }));
    },
  );

  // PATCH /:guildId/translation/config
  app.patch<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/translation/config',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('guild.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const body = TranslationConfigSchema.parse(request.body);
      const config = await prisma.translationConfig.upsert({
        where: { guildId: guild.id },
        create: { guildId: guild.id, ...body },
        update: body,
      });

      await createAuditLog({
        guildId: guild.id,
        actorId: request.user.userId,
        action: 'translation.config.update',
        targetType: 'translation_config',
        targetId: config.id,
        after: body,
      });

      return reply.send(ok(config));
    },
  );
};
