import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog } from '@lunaria/db';
import { ok, err } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';
import { z } from 'zod';

const AiModerationConfigSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.enum(['anthropic', 'openai']).optional(),
  toxicityThreshold: z.number().min(0).max(1).optional(),
  spamThreshold: z.number().min(0).max(1).optional(),
  action: z.enum(['log', 'delete', 'warn', 'mute']).optional(),
  logChannelId: z.string().nullable().optional(),
  exemptRoles: z.array(z.string()).optional(),
});

export const aiModerationRoutes: FastifyPluginAsync = async (app) => {
  // GET /:guildId/ai-moderation/config
  app.get<{ Params: { guildId: string } }>(
    '/:guildId/ai-moderation/config',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const config = await prisma.aiModerationConfig.findUnique({ where: { guildId: guild.id } });
      return reply.send(ok(config ?? { guildId: guild.id, enabled: false }));
    },
  );

  // PATCH /:guildId/ai-moderation/config
  app.patch<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/ai-moderation/config',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('moderation.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const body = AiModerationConfigSchema.parse(request.body);
      const config = await prisma.aiModerationConfig.upsert({
        where: { guildId: guild.id },
        create: { guildId: guild.id, ...body },
        update: body,
      });

      await createAuditLog({
        guildId: guild.id,
        actorId: request.user.userId,
        action: 'ai_moderation.config.update',
        targetType: 'ai_moderation_config',
        targetId: config.id,
        after: body,
      });

      return reply.send(ok(config));
    },
  );

  // GET /:guildId/ai-moderation/scans — scan history
  app.get<{
    Params: { guildId: string };
    Querystring: { flagged?: string; page?: string; pageSize?: string };
  }>(
    '/:guildId/ai-moderation/scans',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('moderation.view');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const { flagged, page = '1', pageSize = '50' } = request.query;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const where = {
        guildId: guild.id,
        ...(flagged !== undefined ? { flagged: flagged === 'true' } : {}),
      };

      const skip = (Number(page) - 1) * Number(pageSize);
      const [scans, total] = await Promise.all([
        prisma.aiModerationScan.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(pageSize) }),
        prisma.aiModerationScan.count({ where }),
      ]);

      return reply.send(ok({ scans, total, page: Number(page), pageSize: Number(pageSize) }));
    },
  );
};
