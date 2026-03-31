import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog } from '@lunaria/db';
import { ok, err } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';
import { z } from 'zod';

const WelcomeConfigSchema = z.object({
  enabled: z.boolean().optional(),
  channelId: z.string().nullable().optional(),
  dmEnabled: z.boolean().optional(),
  message: z.string().min(1).max(2000).optional(),
  dmMessage: z.string().max(2000).nullable().optional(),
  embedColor: z.number().int().min(0).max(16777215).optional(),
  showAvatar: z.boolean().optional(),
});

export const welcomeRoutes: FastifyPluginAsync = async (app) => {
  // GET /:guildId/welcome — get welcome config
  app.get<{ Params: { guildId: string } }>(
    '/:guildId/welcome',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const config = await prisma.welcomeConfig.findUnique({ where: { guildId: guild.id } });
      return reply.send(ok(config ?? { guildId: guild.id, enabled: false }));
    },
  );

  // PATCH /:guildId/welcome — update welcome config
  app.patch<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/welcome',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('guild.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const body = WelcomeConfigSchema.parse(request.body);

      const config = await prisma.welcomeConfig.upsert({
        where: { guildId: guild.id },
        create: { guildId: guild.id, ...body },
        update: body,
      });

      await createAuditLog({
        guildId: guild.id,
        actorId: request.user.userId,
        action: 'welcome.config.update',
        targetType: 'welcome_config',
        targetId: config.id,
        after: body,
      });

      return reply.send(ok(config));
    },
  );
};
