import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog, Prisma } from '@lunaria/db';
import { ok, err } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';
import { z } from 'zod';

const ScheduledMessageCreateSchema = z.object({
  name: z.string().min(1).max(100),
  channelId: z.string().min(1),
  content: z.string().min(1).max(2000),
  embedData: z.record(z.unknown()).nullable().optional(),
  scheduledAt: z.string().datetime(),
});

const ScheduledMessageUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  channelId: z.string().min(1).optional(),
  content: z.string().min(1).max(2000).optional(),
  embedData: z.record(z.unknown()).nullable().optional(),
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(['pending', 'cancelled']).optional(),
});

export const scheduledMessageRoutes: FastifyPluginAsync = async (app) => {
  // GET /:guildId/scheduled-messages
  app.get<{
    Params: { guildId: string };
    Querystring: { status?: string; page?: string; pageSize?: string };
  }>(
    '/:guildId/scheduled-messages',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId } = request.params;
      const { status, page = '1', pageSize = '20' } = request.query;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const where = { guildId: guild.id, ...(status ? { status } : {}) };
      const skip = (Number(page) - 1) * Number(pageSize);

      const [messages, total] = await Promise.all([
        prisma.scheduledMessage.findMany({ where, orderBy: { scheduledAt: 'asc' }, skip, take: Number(pageSize) }),
        prisma.scheduledMessage.count({ where }),
      ]);

      return reply.send(ok({ messages, total, page: Number(page), pageSize: Number(pageSize) }));
    },
  );

  // POST /:guildId/scheduled-messages
  app.post<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/scheduled-messages',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('guild.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const body = ScheduledMessageCreateSchema.parse(request.body);
      const userRecord = await prisma.user.findUnique({ where: { id: request.user.userId } });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { embedData: _embedData, ...bodyRest } = body;
      const message = await prisma.scheduledMessage.create({
        data: {
          guildId: guild.id,
          ...bodyRest,
          scheduledAt: new Date(body.scheduledAt),
          createdBy: userRecord?.discordId ?? null,
          embedData: body.embedData == null ? Prisma.DbNull : body.embedData as Prisma.InputJsonValue,
        },
      });

      await createAuditLog({
        guildId: guild.id,
        actorId: request.user.userId,
        action: 'scheduled_message.create',
        targetType: 'scheduled_message',
        targetId: message.id,
        after: body,
      });

      return reply.status(201).send(ok(message));
    },
  );

  // GET /:guildId/scheduled-messages/:messageId
  app.get<{ Params: { guildId: string; messageId: string } }>(
    '/:guildId/scheduled-messages/:messageId',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId, messageId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const message = await prisma.scheduledMessage.findFirst({ where: { id: messageId, guildId: guild.id } });
      if (!message) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Scheduled message not found'));

      return reply.send(ok(message));
    },
  );

  // PATCH /:guildId/scheduled-messages/:messageId
  app.patch<{ Params: { guildId: string; messageId: string }; Body: unknown }>(
    '/:guildId/scheduled-messages/:messageId',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('guild.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, messageId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const message = await prisma.scheduledMessage.findFirst({ where: { id: messageId, guildId: guild.id } });
      if (!message) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Scheduled message not found'));
      if (message.status === 'sent') return reply.status(409).send(err(ErrorCodes.CONFLICT, 'Cannot update a sent message'));

      const body = ScheduledMessageUpdateSchema.parse(request.body);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { embedData: _embedDataU, ...bodyRestU } = body;
      const updated = await prisma.scheduledMessage.update({
        where: { id: messageId },
        data: {
          ...bodyRestU,
          ...(body.scheduledAt ? { scheduledAt: new Date(body.scheduledAt) } : {}),
          ...(body.embedData !== undefined ? { embedData: body.embedData === null ? Prisma.DbNull : body.embedData as Prisma.InputJsonValue } : {}),
        },
      });

      return reply.send(ok(updated));
    },
  );

  // DELETE /:guildId/scheduled-messages/:messageId
  app.delete<{ Params: { guildId: string; messageId: string } }>(
    '/:guildId/scheduled-messages/:messageId',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('guild.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, messageId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const message = await prisma.scheduledMessage.findFirst({ where: { id: messageId, guildId: guild.id } });
      if (!message) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Scheduled message not found'));

      await prisma.scheduledMessage.delete({ where: { id: messageId } });

      return reply.send(ok({ deleted: true }));
    },
  );
};
