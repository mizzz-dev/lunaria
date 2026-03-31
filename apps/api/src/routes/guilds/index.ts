import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog, saveConfigVersion } from '@lunaria/db';
import { ok, err } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';
import { z } from 'zod';

const SettingsUpdateSchema = z.object({ name: z.string().min(1).max(100).optional() });

export const guildRoutes: FastifyPluginAsync = async (app) => {
  // GET /:guildId
  app.get<{ Params: { guildId: string } }>('/:guildId', { preHandler: app.authenticate }, async (request, reply) => {
    const guild = await prisma.guild.findUnique({ where: { id: request.params.guildId } });
    if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));
    return reply.send(ok(guild));
  });

  // GET /:guildId/dashboard
  app.get<{ Params: { guildId: string } }>('/:guildId/dashboard', { preHandler: app.authenticate }, async (request, reply) => {
    const { guildId } = request.params;
    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

    const [memberCount, enabledPlugins, recentAuditLogs, ruleCount] = await Promise.all([
      prisma.guildMembership.count({ where: { guildId } }),
      prisma.guildPluginSetting.count({ where: { guildId, enabled: true } }),
      prisma.auditLog.findMany({ where: { guildId }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.rule.count({ where: { guildId, enabled: true } }),
    ]);

    return reply.send(ok({ guild, memberCount, enabledPlugins, ruleCount, recentAuditLogs }));
  });

  // GET /:guildId/settings
  app.get<{ Params: { guildId: string } }>('/:guildId/settings', { preHandler: app.authenticate }, async (request, reply) => {
    const guild = await prisma.guild.findUnique({ where: { id: request.params.guildId } });
    if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));
    return reply.send(ok(guild));
  });

  // PATCH /:guildId/settings
  app.patch<{ Params: { guildId: string }; Body: z.infer<typeof SettingsUpdateSchema> }>(
    '/:guildId/settings',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId } = request.params;
      const perm = app.requirePermission('guild.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const body = SettingsUpdateSchema.parse(request.body);
      const before = await prisma.guild.findUnique({ where: { id: guildId } });
      if (!before) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const updated = await prisma.guild.update({ where: { id: guildId }, data: body });
      await Promise.all([
        createAuditLog({ guildId, actorId: request.user.userId, action: 'guild.settings.update', targetType: 'guild', targetId: guildId, before, after: updated }),
        saveConfigVersion({ guildId, scope: 'guild_settings', snapshot: updated, changedBy: request.user.userId }),
      ]);
      return reply.send(ok(updated));
    },
  );
};
