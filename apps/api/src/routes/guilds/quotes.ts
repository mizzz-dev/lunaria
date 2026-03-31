import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog } from '@lunaria/db';
import { ok, err, parsePagination } from '@lunaria/shared';
import { QuoteCreateSchema, QuoteUpdateSchema, QuoteReportSchema } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';

export const quoteRoutes: FastifyPluginAsync = async (app) => {
  // GET /:guildId/quotes
  app.get<{ Params: { guildId: string }; Querystring: Record<string, unknown> }>(
    '/:guildId/quotes', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId } = request.params;
      const { page, pageSize } = parsePagination(request.query);
      const tag = request.query['tag'] as string | undefined;
      const where = { guildId, deleted: false, ...(tag ? { tags: { has: tag } } : {}) };
      const [items, total] = await Promise.all([
        prisma.quote.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.quote.count({ where }),
      ]);
      return reply.send(ok({ items, total, page, pageSize, hasMore: page * pageSize < total }));
    },
  );

  // GET /:guildId/quotes/random
  app.get<{ Params: { guildId: string }; Querystring: { tag?: string } }>(
    '/:guildId/quotes/random', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId } = request.params;
      const tag = request.query.tag;
      const where = { guildId, deleted: false, ...(tag ? { tags: { has: tag } } : {}) };
      const count = await prisma.quote.count({ where });
      if (count === 0) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'No quotes found'));
      const skip = Math.floor(Math.random() * count);
      const [quote] = await prisma.quote.findMany({ where, skip, take: 1 });
      return reply.send(ok(quote));
    },
  );

  // POST /:guildId/quotes
  app.post<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/quotes', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('quote.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const body = QuoteCreateSchema.parse(request.body);
      const quote = await prisma.quote.create({ data: { guildId, ...body, addedBy: request.user.discordId } });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'quote.create', targetType: 'quote', targetId: quote.id, after: quote });
      return reply.status(201).send(ok(quote));
    },
  );

  // GET /:guildId/quotes/:quoteId
  app.get<{ Params: { guildId: string; quoteId: string } }>(
    '/:guildId/quotes/:quoteId', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, quoteId } = request.params;
      const quote = await prisma.quote.findFirst({ where: { id: quoteId, guildId, deleted: false } });
      if (!quote) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Quote not found'));
      return reply.send(ok(quote));
    },
  );

  // PATCH /:guildId/quotes/:quoteId
  app.patch<{ Params: { guildId: string; quoteId: string }; Body: unknown }>(
    '/:guildId/quotes/:quoteId', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('quote.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, quoteId } = request.params;
      const existing = await prisma.quote.findFirst({ where: { id: quoteId, guildId } });
      if (!existing) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Quote not found'));

      const body = QuoteUpdateSchema.parse(request.body);
      const updated = await prisma.quote.update({ where: { id: quoteId }, data: body });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'quote.update', targetType: 'quote', targetId: quoteId, before: existing, after: updated });
      return reply.send(ok(updated));
    },
  );

  // DELETE /:guildId/quotes/:quoteId
  app.delete<{ Params: { guildId: string; quoteId: string } }>(
    '/:guildId/quotes/:quoteId', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('quote.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, quoteId } = request.params;
      const existing = await prisma.quote.findFirst({ where: { id: quoteId, guildId } });
      if (!existing) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Quote not found'));

      await prisma.quote.update({ where: { id: quoteId }, data: { deleted: true } });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'quote.delete', targetType: 'quote', targetId: quoteId, before: existing });
      return reply.send(ok({ deleted: true }));
    },
  );

  // POST /:guildId/quotes/:quoteId/report
  app.post<{ Params: { guildId: string; quoteId: string }; Body: unknown }>(
    '/:guildId/quotes/:quoteId/report', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, quoteId } = request.params;
      const quote = await prisma.quote.findFirst({ where: { id: quoteId, guildId, deleted: false } });
      if (!quote) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Quote not found'));

      const { reason } = QuoteReportSchema.parse(request.body);
      const report = await prisma.quoteReport.create({ data: { quoteId, reportedBy: request.user.discordId, reason } });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'quote.report', targetType: 'quote', targetId: quoteId, metadata: { reason } });
      return reply.status(201).send(ok(report));
    },
  );
};
