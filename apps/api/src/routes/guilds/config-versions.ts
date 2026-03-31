import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog, saveConfigVersion } from '@lunaria/db';
import { ok, err, parsePagination } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';

export const configVersionRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { guildId: string }; Querystring: Record<string, unknown> }>(
    '/:guildId/config-versions', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('config.view');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const { page, pageSize } = parsePagination(request.query);
      const scope = request.query['scope'] as string | undefined;

      const where = { guildId, ...(scope ? { scope } : {}) };
      const [items, total] = await Promise.all([
        prisma.configVersion.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.configVersion.count({ where }),
      ]);

      return reply.send(ok({ items, total, page, pageSize, hasMore: page * pageSize < total }));
    },
  );

  app.get<{ Params: { guildId: string; versionId: string } }>(
    '/:guildId/config-versions/:versionId', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('config.view');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, versionId } = request.params;
      const version = await prisma.configVersion.findFirst({ where: { id: versionId, guildId } });
      if (!version) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Config version not found'));
      return reply.send(ok(version));
    },
  );

  // POST /:guildId/config-versions/:versionId/rollback
  app.post<{ Params: { guildId: string; versionId: string } }>(
    '/:guildId/config-versions/:versionId/rollback', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('config.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, versionId } = request.params;
      const version = await prisma.configVersion.findFirst({ where: { id: versionId, guildId } });
      if (!version) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Config version not found'));

      // Rollback = save a new config version with the old snapshot
      const newVersion = await saveConfigVersion({
        guildId,
        scope: version.scope,
        snapshot: version.snapshot,
        changedBy: request.user.userId,
        changeNote: `Rollback to version ${version.version}`,
      });

      await createAuditLog({
        guildId,
        actorId: request.user.userId,
        action: 'config.rollback',
        targetType: 'config_version',
        targetId: versionId,
        metadata: { rolledBackTo: version.version, newVersion },
      });

      return reply.send(ok({ rolledBackTo: version.version, newVersion }));
    },
  );
};
