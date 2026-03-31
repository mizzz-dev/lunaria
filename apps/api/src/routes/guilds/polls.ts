import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog } from '@lunaria/db';
import { ok, err, parsePagination } from '@lunaria/shared';
import { PollCreateSchema } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';

export const pollRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { guildId: string }; Querystring: Record<string, unknown> }>(
    '/:guildId/polls', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId } = request.params;
      const { page, pageSize } = parsePagination(request.query);
      const [items, total] = await Promise.all([
        prisma.poll.findMany({ where: { guildId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { options: true, _count: { select: { votes: true } } } }),
        prisma.poll.count({ where: { guildId } }),
      ]);
      return reply.send(ok({ items, total, page, pageSize, hasMore: page * pageSize < total }));
    },
  );

  app.post<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/polls', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('poll.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const body = PollCreateSchema.parse(request.body);
      const poll = await prisma.poll.create({
        data: {
          guildId,
          channelId: body.channelId,
          title: body.title,
          description: body.description,
          voteType: body.voteType,
          anonymous: body.anonymous,
          endsAt: body.endsAt ? new Date(body.endsAt) : null,
          createdBy: request.user.discordId,
          options: { create: body.options.map((o, i) => ({ label: o.label, emoji: o.emoji, position: i })) },
        },
        include: { options: true },
      });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'poll.create', targetType: 'poll', targetId: poll.id });
      return reply.status(201).send(ok(poll));
    },
  );

  app.get<{ Params: { guildId: string; pollId: string } }>(
    '/:guildId/polls/:pollId', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, pollId } = request.params;
      const poll = await prisma.poll.findFirst({ where: { id: pollId, guildId }, include: { options: true } });
      if (!poll) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Poll not found'));
      return reply.send(ok(poll));
    },
  );

  app.delete<{ Params: { guildId: string; pollId: string } }>(
    '/:guildId/polls/:pollId', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('poll.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, pollId } = request.params;
      const poll = await prisma.poll.findFirst({ where: { id: pollId, guildId } });
      if (!poll) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Poll not found'));
      await prisma.poll.delete({ where: { id: pollId } });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'poll.delete', targetType: 'poll', targetId: pollId });
      return reply.send(ok({ deleted: true }));
    },
  );

  app.post<{ Params: { guildId: string; pollId: string } }>(
    '/:guildId/polls/:pollId/close', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('poll.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, pollId } = request.params;
      const poll = await prisma.poll.findFirst({ where: { id: pollId, guildId } });
      if (!poll) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Poll not found'));

      const updated = await prisma.poll.update({ where: { id: pollId }, data: { closed: true } });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'poll.close', targetType: 'poll', targetId: pollId });
      return reply.send(ok(updated));
    },
  );

  app.get<{ Params: { guildId: string; pollId: string } }>(
    '/:guildId/polls/:pollId/results', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, pollId } = request.params;
      const poll = await prisma.poll.findFirst({ where: { id: pollId, guildId }, include: { options: { include: { _count: { select: { votes: true } } } } } });
      if (!poll) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Poll not found'));

      const totalVotes = poll.options.reduce((sum, o) => sum + o._count.votes, 0);
      const results = poll.options.map((o) => ({
        optionId: o.id,
        label: o.label,
        emoji: o.emoji,
        votes: o._count.votes,
        percentage: totalVotes > 0 ? Math.round((o._count.votes / totalVotes) * 100) : 0,
      }));

      return reply.send(ok({ pollId, totalVotes, results }));
    },
  );
};
