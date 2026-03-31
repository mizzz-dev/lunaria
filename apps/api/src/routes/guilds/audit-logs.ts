import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@lunaria/db';
import { ok, parsePagination } from '@lunaria/shared';

export const auditLogRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { guildId: string }; Querystring: Record<string, unknown> }>(
    '/:guildId/audit-logs', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('audit.view');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const { page, pageSize } = parsePagination(request.query);
      const action = request.query['action'] as string | undefined;
      const actorId = request.query['actorId'] as string | undefined;

      const where = {
        guildId,
        ...(action ? { action: { contains: action } } : {}),
        ...(actorId ? { actorId } : {}),
      };

      const [items, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { actor: { select: { id: true, discordId: true, username: true, avatar: true } } },
        }),
        prisma.auditLog.count({ where }),
      ]);

      return reply.send(ok({ items, total, page, pageSize, hasMore: page * pageSize < total }));
    },
  );
};
