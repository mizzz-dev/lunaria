import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog } from '@lunaria/db';
import { ok, err, parsePagination } from '@lunaria/shared';
import { LfgCreateSchema, LfgUpdateSchema, LfgEntryCreateSchema } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';

export const lfgRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { guildId: string }; Querystring: Record<string, unknown> }>(
    '/:guildId/lfg', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId } = request.params;
      const { page, pageSize } = parsePagination(request.query);
      const [items, total] = await Promise.all([
        prisma.lfgPost.findMany({ where: { guildId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { _count: { select: { entries: true } } } }),
        prisma.lfgPost.count({ where: { guildId } }),
      ]);
      return reply.send(ok({ items, total, page, pageSize, hasMore: page * pageSize < total }));
    },
  );

  app.post<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/lfg', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId } = request.params;
      const body = LfgCreateSchema.parse(request.body);
      const post = await prisma.lfgPost.create({
        data: { guildId, ...body, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null, createdBy: request.user.discordId },
      });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'lfg.create', targetType: 'lfg', targetId: post.id });
      return reply.status(201).send(ok(post));
    },
  );

  app.get<{ Params: { guildId: string; lfgId: string } }>(
    '/:guildId/lfg/:lfgId', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, lfgId } = request.params;
      const post = await prisma.lfgPost.findFirst({ where: { id: lfgId, guildId }, include: { entries: true } });
      if (!post) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'LFG post not found'));
      return reply.send(ok(post));
    },
  );

  app.patch<{ Params: { guildId: string; lfgId: string }; Body: unknown }>(
    '/:guildId/lfg/:lfgId', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('lfg.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, lfgId } = request.params;
      const existing = await prisma.lfgPost.findFirst({ where: { id: lfgId, guildId } });
      if (!existing) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'LFG post not found'));

      const body = LfgUpdateSchema.parse(request.body);
      const updated = await prisma.lfgPost.update({ where: { id: lfgId }, data: { ...body, expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined } });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'lfg.update', targetType: 'lfg', targetId: lfgId, before: existing, after: updated });
      return reply.send(ok(updated));
    },
  );

  app.delete<{ Params: { guildId: string; lfgId: string } }>(
    '/:guildId/lfg/:lfgId', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('lfg.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, lfgId } = request.params;
      const existing = await prisma.lfgPost.findFirst({ where: { id: lfgId, guildId } });
      if (!existing) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'LFG post not found'));
      await prisma.lfgPost.delete({ where: { id: lfgId } });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'lfg.delete', targetType: 'lfg', targetId: lfgId });
      return reply.send(ok({ deleted: true }));
    },
  );

  app.post<{ Params: { guildId: string; lfgId: string } }>(
    '/:guildId/lfg/:lfgId/close', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('lfg.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, lfgId } = request.params;
      const post = await prisma.lfgPost.findFirst({ where: { id: lfgId, guildId } });
      if (!post) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'LFG post not found'));
      const updated = await prisma.lfgPost.update({ where: { id: lfgId }, data: { status: 'closed' } });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'lfg.close', targetType: 'lfg', targetId: lfgId });
      return reply.send(ok(updated));
    },
  );

  app.get<{ Params: { guildId: string; lfgId: string } }>(
    '/:guildId/lfg/:lfgId/entries', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, lfgId } = request.params;
      const post = await prisma.lfgPost.findFirst({ where: { id: lfgId, guildId } });
      if (!post) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'LFG post not found'));
      const entries = await prisma.lfgEntry.findMany({ where: { lfgId } });
      return reply.send(ok(entries));
    },
  );

  // POST /:guildId/lfg/:lfgId/entries - join
  app.post<{ Params: { guildId: string; lfgId: string }; Body: unknown }>(
    '/:guildId/lfg/:lfgId/entries', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, lfgId } = request.params;
      const post = await prisma.lfgPost.findFirst({ where: { id: lfgId, guildId, status: 'open' } });
      if (!post) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'LFG post not found or closed'));

      const { note } = LfgEntryCreateSchema.parse(request.body);
      const entry = await prisma.lfgEntry.upsert({
        where: { lfgId_userId: { lfgId, userId: request.user.discordId } },
        create: { lfgId, userId: request.user.discordId, note },
        update: { note },
      });
      return reply.send(ok(entry));
    },
  );

  // DELETE /:guildId/lfg/:lfgId/entries/me - leave
  app.delete<{ Params: { guildId: string; lfgId: string } }>(
    '/:guildId/lfg/:lfgId/entries/me', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, lfgId } = request.params;
      const post = await prisma.lfgPost.findFirst({ where: { id: lfgId, guildId } });
      if (!post) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'LFG post not found'));

      await prisma.lfgEntry.deleteMany({ where: { lfgId, userId: request.user.discordId } });
      return reply.send(ok({ left: true }));
    },
  );
};
