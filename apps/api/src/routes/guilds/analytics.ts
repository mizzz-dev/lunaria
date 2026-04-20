import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@lunaria/db';
import { ok } from '@lunaria/shared';

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  // GET /:guildId/analytics/stream (SSE)
  app.get<{ Params: { guildId: string } }>(
    '/:guildId/analytics/stream', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('analytics.view');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      reply.raw.write('\n');

      const pushSummary = async (): Promise<void> => {
        const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const to = new Date();
        const [memberCount, messageCount, moderationCount, pollCount, eventCount, lfgCount] = await Promise.all([
          prisma.guildMembership.count({ where: { guildId } }),
          prisma.analyticsEvent.count({ where: { guildId, eventType: 'message', occurredAt: { gte: from, lte: to } } }),
          prisma.moderationAction.count({ where: { guildId, createdAt: { gte: from, lte: to } } }),
          prisma.poll.count({ where: { guildId, createdAt: { gte: from, lte: to } } }),
          prisma.event.count({ where: { guildId, createdAt: { gte: from, lte: to } } }),
          prisma.lfgPost.count({ where: { guildId, createdAt: { gte: from, lte: to } } }),
        ]);
        reply.raw.write(`event: summary\n`);
        reply.raw.write(`data: ${JSON.stringify({ memberCount, messageCount, moderationCount, pollCount, eventCount, lfgCount })}\n\n`);
      };

      await pushSummary();
      const timer = setInterval(() => {
        pushSummary().catch((error) => app.log.error({ error, requestId: request.id }, 'analytics sse push failed'));
      }, 15_000);

      request.raw.on('close', () => {
        clearInterval(timer);
      });
    },
  );

  // GET /:guildId/analytics/summary
  app.get<{ Params: { guildId: string }; Querystring: { from?: string; to?: string } }>(
    '/:guildId/analytics/summary', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('analytics.view');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const from = request.query.from ? new Date(request.query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = request.query.to ? new Date(request.query.to) : new Date();

      const [memberCount, messageCount, moderationCount, pollCount, eventCount, lfgCount] = await Promise.all([
        prisma.guildMembership.count({ where: { guildId } }),
        prisma.analyticsEvent.count({ where: { guildId, eventType: 'message', occurredAt: { gte: from, lte: to } } }),
        prisma.moderationAction.count({ where: { guildId, createdAt: { gte: from, lte: to } } }),
        prisma.poll.count({ where: { guildId, createdAt: { gte: from, lte: to } } }),
        prisma.event.count({ where: { guildId, createdAt: { gte: from, lte: to } } }),
        prisma.lfgPost.count({ where: { guildId, createdAt: { gte: from, lte: to } } }),
      ]);

      return reply.send(ok({ guildId, from, to, memberCount, messageCount, moderationCount, pollCount, eventCount, lfgCount }));
    },
  );

  // GET /:guildId/analytics/daily
  app.get<{ Params: { guildId: string }; Querystring: { from?: string; to?: string } }>(
    '/:guildId/analytics/daily', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('analytics.view');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const from = request.query.from ? new Date(request.query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = request.query.to ? new Date(request.query.to) : new Date();

      const daily = await prisma.analyticsDaily.findMany({
        where: { guildId, date: { gte: from, lte: to } },
        orderBy: { date: 'asc' },
      });
      return reply.send(ok(daily));
    },
  );

  // GET /:guildId/analytics/lfg
  app.get<{ Params: { guildId: string }; Querystring: { from?: string } }>(
    '/:guildId/analytics/lfg', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('analytics.view');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const from = request.query.from ? new Date(request.query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const posts = await prisma.lfgPost.findMany({
        where: { guildId, createdAt: { gte: from } },
        include: { _count: { select: { entries: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      const totalPosts = posts.length;
      const totalJoins = posts.reduce((sum, p) => sum + p._count.entries, 0);
      const byGame = posts.reduce((acc, p) => {
        const game = p.game ?? 'Unknown';
        acc[game] = (acc[game] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return reply.send(ok({ totalPosts, totalJoins, byGame }));
    },
  );

  // GET /:guildId/analytics/events
  app.get<{ Params: { guildId: string }; Querystring: { from?: string } }>(
    '/:guildId/analytics/events', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('analytics.view');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const from = request.query.from ? new Date(request.query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const events = await prisma.event.findMany({
        where: { guildId, createdAt: { gte: from } },
        include: { _count: { select: { participants: true } } },
        orderBy: { startsAt: 'desc' },
        take: 50,
      });
      const byStatus = events.reduce((acc, e) => { acc[e.status] = (acc[e.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);
      const avgParticipants = events.length > 0 ? events.reduce((sum, e) => sum + e._count.participants, 0) / events.length : 0;

      return reply.send(ok({ total: events.length, byStatus, avgParticipants: Math.round(avgParticipants * 10) / 10 }));
    },
  );

  // GET /:guildId/analytics/moderation
  app.get<{ Params: { guildId: string }; Querystring: { from?: string } }>(
    '/:guildId/analytics/moderation', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('analytics.view');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const from = request.query.from ? new Date(request.query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const actions = await prisma.moderationAction.findMany({
        where: { guildId, createdAt: { gte: from } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      const byType = actions.reduce((acc, a) => { acc[a.actionType] = (acc[a.actionType] ?? 0) + 1; return acc; }, {} as Record<string, number>);
      const automated = actions.filter((a) => !a.moderatorId).length;
      const manual = actions.length - automated;

      return reply.send(ok({ total: actions.length, byType, automated, manual }));
    },
  );
};
