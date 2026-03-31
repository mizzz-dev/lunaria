import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog } from '@lunaria/db';
import { ok, err, parsePagination } from '@lunaria/shared';
import { ReminderCreateSchema } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';

export const reminderRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { guildId: string }; Querystring: Record<string, unknown> }>(
    '/:guildId/reminders', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId } = request.params;
      const { page, pageSize } = parsePagination(request.query);
      const [items, total] = await Promise.all([
        prisma.reminder.findMany({ where: { guildId, userId: request.user.userId }, orderBy: { remindAt: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.reminder.count({ where: { guildId, userId: request.user.userId } }),
      ]);
      return reply.send(ok({ items, total, page, pageSize, hasMore: page * pageSize < total }));
    },
  );

  app.post<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/reminders', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId } = request.params;
      const body = ReminderCreateSchema.parse(request.body);
      const reminder = await prisma.reminder.create({
        data: { guildId, userId: request.user.userId, ...body, remindAt: new Date(body.remindAt) },
      });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'reminder.create', targetType: 'reminder', targetId: reminder.id });
      return reply.status(201).send(ok(reminder));
    },
  );

  app.get<{ Params: { guildId: string; reminderId: string } }>(
    '/:guildId/reminders/:reminderId', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, reminderId } = request.params;
      const reminder = await prisma.reminder.findFirst({ where: { id: reminderId, guildId, userId: request.user.userId } });
      if (!reminder) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Reminder not found'));
      return reply.send(ok(reminder));
    },
  );

  app.delete<{ Params: { guildId: string; reminderId: string } }>(
    '/:guildId/reminders/:reminderId', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, reminderId } = request.params;
      const reminder = await prisma.reminder.findFirst({ where: { id: reminderId, guildId, userId: request.user.userId } });
      if (!reminder) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Reminder not found'));
      await prisma.reminder.delete({ where: { id: reminderId } });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'reminder.delete', targetType: 'reminder', targetId: reminderId });
      return reply.send(ok({ deleted: true }));
    },
  );
};
