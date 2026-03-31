import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog } from '@lunaria/db';
import { ok, err } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';
import { z } from 'zod';

const TicketConfigSchema = z.object({
  enabled: z.boolean().optional(),
  panelChannelId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  supportRoleIds: z.array(z.string()).optional(),
  welcomeMessage: z.string().min(1).max(2000).optional(),
  maxOpenPerUser: z.number().int().min(1).max(10).optional(),
});

export const ticketRoutes: FastifyPluginAsync = async (app) => {
  // GET /:guildId/tickets/config
  app.get<{ Params: { guildId: string } }>(
    '/:guildId/tickets/config',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const config = await prisma.ticketConfig.findUnique({ where: { guildId: guild.id } });
      return reply.send(ok(config ?? { guildId: guild.id, enabled: false }));
    },
  );

  // PATCH /:guildId/tickets/config
  app.patch<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/tickets/config',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('guild.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const body = TicketConfigSchema.parse(request.body);
      const config = await prisma.ticketConfig.upsert({
        where: { guildId: guild.id },
        create: { guildId: guild.id, ...body },
        update: body,
      });

      await createAuditLog({
        guildId: guild.id,
        actorId: request.user.userId,
        action: 'ticket.config.update',
        targetType: 'ticket_config',
        targetId: config.id,
        after: body,
      });

      return reply.send(ok(config));
    },
  );

  // GET /:guildId/tickets — list tickets
  app.get<{ Params: { guildId: string }; Querystring: { status?: string; page?: string; pageSize?: string } }>(
    '/:guildId/tickets',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId } = request.params;
      const { status, page = '1', pageSize = '20' } = request.query;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const skip = (Number(page) - 1) * Number(pageSize);
      const where = { guildId: guild.id, ...(status ? { status } : {}) };

      const [tickets, total] = await Promise.all([
        prisma.ticket.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(pageSize) }),
        prisma.ticket.count({ where }),
      ]);

      return reply.send(ok({ tickets, total, page: Number(page), pageSize: Number(pageSize) }));
    },
  );

  // GET /:guildId/tickets/:ticketId
  app.get<{ Params: { guildId: string; ticketId: string } }>(
    '/:guildId/tickets/:ticketId',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId, ticketId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, guildId: guild.id } });
      if (!ticket) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Ticket not found'));

      return reply.send(ok(ticket));
    },
  );

  // POST /:guildId/tickets/:ticketId/close
  app.post<{ Params: { guildId: string; ticketId: string } }>(
    '/:guildId/tickets/:ticketId/close',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('moderation.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, ticketId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, guildId: guild.id } });
      if (!ticket) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Ticket not found'));
      if (ticket.status === 'closed') return reply.status(409).send(err(ErrorCodes.CONFLICT, 'Ticket is already closed'));

      const userRecord = await prisma.user.findUnique({ where: { id: request.user.userId } });
      const updated = await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'closed', closedAt: new Date(), closedBy: userRecord?.discordId ?? request.user.userId },
      });

      await createAuditLog({
        guildId: guild.id,
        actorId: request.user.userId,
        action: 'ticket.close',
        targetType: 'ticket',
        targetId: ticketId,
      });

      return reply.send(ok(updated));
    },
  );
};
