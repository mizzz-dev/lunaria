import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog } from '@lunaria/db';
import { ok, err, parsePagination } from '@lunaria/shared';
import { FaqCreateSchema, FaqUpdateSchema, FaqFeedbackSchema } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';

export const faqRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { guildId: string }; Querystring: Record<string, unknown> }>(
    '/:guildId/faqs', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId } = request.params;
      const { page, pageSize } = parsePagination(request.query);
      const q = request.query['q'] as string | undefined;
      const where = {
        guildId,
        status: 'published' as const,
        ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' as const } }, { content: { contains: q, mode: 'insensitive' as const } }] } : {}),
      };
      const [items, total] = await Promise.all([
        prisma.faqArticle.findMany({ where, orderBy: { viewCount: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.faqArticle.count({ where }),
      ]);
      return reply.send(ok({ items, total, page, pageSize, hasMore: page * pageSize < total }));
    },
  );

  app.post<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/faqs', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('faq.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const body = FaqCreateSchema.parse(request.body);
      const article = await prisma.faqArticle.create({ data: { guildId, ...body, createdBy: request.user.userId } });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'faq.create', targetType: 'faq', targetId: article.id });
      return reply.status(201).send(ok(article));
    },
  );

  app.get<{ Params: { guildId: string; faqId: string } }>(
    '/:guildId/faqs/:faqId', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, faqId } = request.params;
      const article = await prisma.faqArticle.findFirst({ where: { id: faqId, guildId } });
      if (!article) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'FAQ article not found'));
      // Increment view count (fire-and-forget)
      prisma.faqArticle.update({ where: { id: faqId }, data: { viewCount: { increment: 1 } } }).catch(() => void 0);
      return reply.send(ok(article));
    },
  );

  app.patch<{ Params: { guildId: string; faqId: string }; Body: unknown }>(
    '/:guildId/faqs/:faqId', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('faq.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, faqId } = request.params;
      const existing = await prisma.faqArticle.findFirst({ where: { id: faqId, guildId } });
      if (!existing) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'FAQ article not found'));

      const body = FaqUpdateSchema.parse(request.body);
      const updated = await prisma.faqArticle.update({ where: { id: faqId }, data: body });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'faq.update', targetType: 'faq', targetId: faqId, before: existing, after: updated });
      return reply.send(ok(updated));
    },
  );

  app.delete<{ Params: { guildId: string; faqId: string } }>(
    '/:guildId/faqs/:faqId', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('faq.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, faqId } = request.params;
      const existing = await prisma.faqArticle.findFirst({ where: { id: faqId, guildId } });
      if (!existing) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'FAQ article not found'));
      await prisma.faqArticle.delete({ where: { id: faqId } });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'faq.delete', targetType: 'faq', targetId: faqId });
      return reply.send(ok({ deleted: true }));
    },
  );

  app.post<{ Params: { guildId: string; faqId: string }; Body: unknown }>(
    '/:guildId/faqs/:faqId/feedback', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, faqId } = request.params;
      const article = await prisma.faqArticle.findFirst({ where: { id: faqId, guildId } });
      if (!article) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'FAQ article not found'));

      const { rating, comment } = FaqFeedbackSchema.parse(request.body);
      const feedback = await prisma.faqFeedback.create({ data: { articleId: faqId, userId: request.user.discordId, rating, comment } });
      await prisma.faqArticle.update({
        where: { id: faqId },
        data: rating === 'helpful' ? { helpful: { increment: 1 } } : { notHelpful: { increment: 1 } },
      });
      return reply.status(201).send(ok(feedback));
    },
  );
};
