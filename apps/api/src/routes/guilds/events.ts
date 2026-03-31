import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog } from '@lunaria/db';
import { ok, err, parsePagination } from '@lunaria/shared';
import { EventCreateSchema, EventUpdateSchema, EventParticipantStatusSchema } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';

export const eventRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { guildId: string }; Querystring: Record<string, unknown> }>(
    '/:guildId/events', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId } = request.params;
      const { page, pageSize } = parsePagination(request.query);
      const [items, total] = await Promise.all([
        prisma.event.findMany({ where: { guildId }, orderBy: { startsAt: 'asc' }, skip: (page - 1) * pageSize, take: pageSize, include: { _count: { select: { participants: true } } } }),
        prisma.event.count({ where: { guildId } }),
      ]);
      return reply.send(ok({ items, total, page, pageSize, hasMore: page * pageSize < total }));
    },
  );

  app.post<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/events', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('event.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const body = EventCreateSchema.parse(request.body);
      const event = await prisma.event.create({
        data: { guildId, ...body, startsAt: new Date(body.startsAt), endsAt: body.endsAt ? new Date(body.endsAt) : null, createdBy: request.user.discordId },
      });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'event.create', targetType: 'event', targetId: event.id });
      return reply.status(201).send(ok(event));
    },
  );

  app.get<{ Params: { guildId: string; eventId: string } }>(
    '/:guildId/events/:eventId', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, eventId } = request.params;
      const event = await prisma.event.findFirst({ where: { id: eventId, guildId }, include: { participants: true } });
      if (!event) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Event not found'));
      return reply.send(ok(event));
    },
  );

  app.patch<{ Params: { guildId: string; eventId: string }; Body: unknown }>(
    '/:guildId/events/:eventId', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('event.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, eventId } = request.params;
      const existing = await prisma.event.findFirst({ where: { id: eventId, guildId } });
      if (!existing) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Event not found'));

      const body = EventUpdateSchema.parse(request.body);
      const updated = await prisma.event.update({
        where: { id: eventId },
        data: { ...body, startsAt: body.startsAt ? new Date(body.startsAt) : undefined, endsAt: body.endsAt ? new Date(body.endsAt) : undefined },
      });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'event.update', targetType: 'event', targetId: eventId, before: existing, after: updated });
      return reply.send(ok(updated));
    },
  );

  app.post<{ Params: { guildId: string; eventId: string } }>(
    '/:guildId/events/:eventId/cancel', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('event.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, eventId } = request.params;
      const event = await prisma.event.findFirst({ where: { id: eventId, guildId } });
      if (!event) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Event not found'));

      const updated = await prisma.event.update({ where: { id: eventId }, data: { status: 'cancelled' } });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'event.cancel', targetType: 'event', targetId: eventId });
      return reply.send(ok(updated));
    },
  );

  app.get<{ Params: { guildId: string; eventId: string } }>(
    '/:guildId/events/:eventId/participants', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, eventId } = request.params;
      const event = await prisma.event.findFirst({ where: { id: eventId, guildId } });
      if (!event) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Event not found'));
      const participants = await prisma.eventParticipant.findMany({ where: { eventId } });
      return reply.send(ok(participants));
    },
  );

  app.post<{ Params: { guildId: string; eventId: string }; Body: unknown }>(
    '/:guildId/events/:eventId/participants', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, eventId } = request.params;
      const event = await prisma.event.findFirst({ where: { id: eventId, guildId } });
      if (!event) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Event not found'));

      const { status } = EventParticipantStatusSchema.parse(request.body);
      const participant = await prisma.eventParticipant.upsert({
        where: { eventId_userId: { eventId, userId: request.user.discordId } },
        create: { eventId, userId: request.user.discordId, status },
        update: { status },
      });
      return reply.send(ok(participant));
    },
  );
};
