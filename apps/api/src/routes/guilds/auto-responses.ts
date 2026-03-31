import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog, saveConfigVersion } from '@lunaria/db';
import { ok, err, parsePagination, configScope } from '@lunaria/shared';
import { AutoResponseCreateSchema, AutoResponseUpdateSchema } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';

export const autoResponseRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { guildId: string }; Querystring: Record<string, unknown> }>(
    '/:guildId/auto-responses', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId } = request.params;
      const { page, pageSize } = parsePagination(request.query);
      const [items, total] = await Promise.all([
        prisma.autoResponse.findMany({ where: { guildId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.autoResponse.count({ where: { guildId } }),
      ]);
      return reply.send(ok({ items, total, page, pageSize, hasMore: page * pageSize < total }));
    },
  );

  app.post<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/auto-responses', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('auto_response.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const body = AutoResponseCreateSchema.parse(request.body);
      const ar = await prisma.autoResponse.create({ data: { guildId, ...body, createdBy: request.user.userId } });
      await Promise.all([
        createAuditLog({ guildId, actorId: request.user.userId, action: 'auto_response.create', targetType: 'auto_response', targetId: ar.id, after: ar }),
        saveConfigVersion({ guildId, scope: configScope('auto_response', ar.id), snapshot: ar, changedBy: request.user.userId }),
      ]);
      return reply.status(201).send(ok(ar));
    },
  );

  app.get<{ Params: { guildId: string; id: string } }>(
    '/:guildId/auto-responses/:id', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, id } = request.params;
      const ar = await prisma.autoResponse.findFirst({ where: { id, guildId } });
      if (!ar) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Auto response not found'));
      return reply.send(ok(ar));
    },
  );

  app.patch<{ Params: { guildId: string; id: string }; Body: unknown }>(
    '/:guildId/auto-responses/:id', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('auto_response.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, id } = request.params;
      const existing = await prisma.autoResponse.findFirst({ where: { id, guildId } });
      if (!existing) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Auto response not found'));

      const body = AutoResponseUpdateSchema.parse(request.body);
      const updated = await prisma.autoResponse.update({ where: { id }, data: body });
      await Promise.all([
        createAuditLog({ guildId, actorId: request.user.userId, action: 'auto_response.update', targetType: 'auto_response', targetId: id, before: existing, after: updated }),
        saveConfigVersion({ guildId, scope: configScope('auto_response', id), snapshot: updated, changedBy: request.user.userId }),
      ]);
      return reply.send(ok(updated));
    },
  );

  app.delete<{ Params: { guildId: string; id: string } }>(
    '/:guildId/auto-responses/:id', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('auto_response.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, id } = request.params;
      const existing = await prisma.autoResponse.findFirst({ where: { id, guildId } });
      if (!existing) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Auto response not found'));
      await prisma.autoResponse.delete({ where: { id } });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'auto_response.delete', targetType: 'auto_response', targetId: id });
      return reply.send(ok({ deleted: true }));
    },
  );
};
