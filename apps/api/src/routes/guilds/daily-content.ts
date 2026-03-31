import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog, saveConfigVersion } from '@lunaria/db';
import { ok, err, parsePagination, configScope } from '@lunaria/shared';
import { DailyContentJobCreateSchema, DailyContentJobUpdateSchema } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';

export const dailyContentRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { guildId: string }; Querystring: Record<string, unknown> }>(
    '/:guildId/daily-content/jobs', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId } = request.params;
      const { page, pageSize } = parsePagination(request.query);
      const [items, total] = await Promise.all([
        prisma.dailyContentJob.findMany({ where: { guildId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.dailyContentJob.count({ where: { guildId } }),
      ]);
      return reply.send(ok({ items, total, page, pageSize, hasMore: page * pageSize < total }));
    },
  );

  app.post<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/daily-content/jobs', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('daily_content.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const body = DailyContentJobCreateSchema.parse(request.body);
      const job = await prisma.dailyContentJob.create({ data: { guildId, ...body } });
      await Promise.all([
        createAuditLog({ guildId, actorId: request.user.userId, action: 'daily_content.job.create', targetType: 'daily_content_job', targetId: job.id, after: job }),
        saveConfigVersion({ guildId, scope: configScope('daily_content', job.id), snapshot: job, changedBy: request.user.userId }),
      ]);
      return reply.status(201).send(ok(job));
    },
  );

  app.get<{ Params: { guildId: string; jobId: string } }>(
    '/:guildId/daily-content/jobs/:jobId', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, jobId } = request.params;
      const job = await prisma.dailyContentJob.findFirst({ where: { id: jobId, guildId }, include: { runs: { orderBy: { createdAt: 'desc' }, take: 10 } } });
      if (!job) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Daily content job not found'));
      return reply.send(ok(job));
    },
  );

  app.patch<{ Params: { guildId: string; jobId: string }; Body: unknown }>(
    '/:guildId/daily-content/jobs/:jobId', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('daily_content.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, jobId } = request.params;
      const existing = await prisma.dailyContentJob.findFirst({ where: { id: jobId, guildId } });
      if (!existing) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Daily content job not found'));

      const body = DailyContentJobUpdateSchema.parse(request.body);
      const updated = await prisma.dailyContentJob.update({ where: { id: jobId }, data: body });
      await Promise.all([
        createAuditLog({ guildId, actorId: request.user.userId, action: 'daily_content.job.update', targetType: 'daily_content_job', targetId: jobId, before: existing, after: updated }),
        saveConfigVersion({ guildId, scope: configScope('daily_content', jobId), snapshot: updated, changedBy: request.user.userId }),
      ]);
      return reply.send(ok(updated));
    },
  );

  app.delete<{ Params: { guildId: string; jobId: string } }>(
    '/:guildId/daily-content/jobs/:jobId', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('daily_content.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, jobId } = request.params;
      const existing = await prisma.dailyContentJob.findFirst({ where: { id: jobId, guildId } });
      if (!existing) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Daily content job not found'));
      await prisma.dailyContentJob.delete({ where: { id: jobId } });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'daily_content.job.delete', targetType: 'daily_content_job', targetId: jobId });
      return reply.send(ok({ deleted: true }));
    },
  );

  // POST /:guildId/daily-content/jobs/:jobId/run-now - manually trigger
  app.post<{ Params: { guildId: string; jobId: string } }>(
    '/:guildId/daily-content/jobs/:jobId/run-now', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('daily_content.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, jobId } = request.params;
      const job = await prisma.dailyContentJob.findFirst({ where: { id: jobId, guildId } });
      if (!job) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Daily content job not found'));

      // Queue the job via Redis/BullMQ
      // The worker will pick it up. Here we just log the intent.
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'daily_content.job.run_now', targetType: 'daily_content_job', targetId: jobId });

      // In a real implementation, this would publish to the queue.
      // For MVP, we record the request and return success.
      return reply.send(ok({ queued: true, jobId }));
    },
  );
};
