import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog, saveConfigVersion, Prisma } from '@lunaria/db';
import { ok, err, parsePagination, configScope } from '@lunaria/shared';
import { RuleCreateSchema, RuleUpdateSchema, RuleTestSchema } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';
import { testRule } from '@lunaria/rule-engine';
import type { RuleCondition, RuleContext } from '@lunaria/types';

export const ruleRoutes: FastifyPluginAsync = async (app) => {
  // GET /:guildId/rules
  app.get<{ Params: { guildId: string }; Querystring: Record<string, unknown> }>(
    '/:guildId/rules',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId } = request.params;
      const { page, pageSize } = parsePagination(request.query);
      const [items, total] = await Promise.all([
        prisma.rule.findMany({
          where: { guildId },
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.rule.count({ where: { guildId } }),
      ]);
      return reply.send(ok({ items, total, page, pageSize, hasMore: page * pageSize < total }));
    },
  );

  // POST /:guildId/rules
  app.post<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/rules',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('rule.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const body = RuleCreateSchema.parse(request.body);
      const rule = await prisma.rule.create({
        data: {
          guildId,
          name: body.name,
          description: body.description,
          enabled: body.enabled,
          trigger: body.trigger,
          triggerConfig: body.triggerConfig as unknown as Prisma.InputJsonValue,
          conditions: body.conditions as unknown as Prisma.InputJsonValue,
          actions: body.actions as unknown as Prisma.InputJsonValue,
          priority: body.priority,
          createdBy: request.user.userId,
        },
      });

      await Promise.all([
        createAuditLog({ guildId, actorId: request.user.userId, action: 'rule.create', targetType: 'rule', targetId: rule.id, after: rule }),
        saveConfigVersion({ guildId, scope: configScope('rule', rule.id), snapshot: rule, changedBy: request.user.userId }),
      ]);

      return reply.status(201).send(ok(rule));
    },
  );

  // GET /:guildId/rules/:ruleId
  app.get<{ Params: { guildId: string; ruleId: string } }>(
    '/:guildId/rules/:ruleId',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId, ruleId } = request.params;
      const rule = await prisma.rule.findFirst({ where: { id: ruleId, guildId } });
      if (!rule) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Rule not found'));
      return reply.send(ok(rule));
    },
  );

  // PATCH /:guildId/rules/:ruleId
  app.patch<{ Params: { guildId: string; ruleId: string }; Body: unknown }>(
    '/:guildId/rules/:ruleId',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('rule.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, ruleId } = request.params;
      const existing = await prisma.rule.findFirst({ where: { id: ruleId, guildId } });
      if (!existing) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Rule not found'));

      const body = RuleUpdateSchema.parse(request.body);
      const updated = await prisma.rule.update({
        where: { id: ruleId },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
          ...(body.trigger !== undefined ? { trigger: body.trigger } : {}),
          ...(body.priority !== undefined ? { priority: body.priority } : {}),
          ...(body.triggerConfig !== undefined ? { triggerConfig: body.triggerConfig as unknown as Prisma.InputJsonValue } : {}),
          ...(body.conditions !== undefined ? { conditions: body.conditions as unknown as Prisma.InputJsonValue } : {}),
          ...(body.actions !== undefined ? { actions: body.actions as unknown as Prisma.InputJsonValue } : {}),
        },
      });

      await Promise.all([
        createAuditLog({ guildId, actorId: request.user.userId, action: 'rule.update', targetType: 'rule', targetId: ruleId, before: existing, after: updated }),
        saveConfigVersion({ guildId, scope: configScope('rule', ruleId), snapshot: updated, changedBy: request.user.userId }),
      ]);

      return reply.send(ok(updated));
    },
  );

  // DELETE /:guildId/rules/:ruleId
  app.delete<{ Params: { guildId: string; ruleId: string } }>(
    '/:guildId/rules/:ruleId',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('rule.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, ruleId } = request.params;
      const existing = await prisma.rule.findFirst({ where: { id: ruleId, guildId } });
      if (!existing) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Rule not found'));

      await prisma.rule.delete({ where: { id: ruleId } });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'rule.delete', targetType: 'rule', targetId: ruleId, before: existing });

      return reply.send(ok({ deleted: true }));
    },
  );

  // POST /:guildId/rules/:ruleId/test - dry-run
  app.post<{ Params: { guildId: string; ruleId: string }; Body: unknown }>(
    '/:guildId/rules/:ruleId/test',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId, ruleId } = request.params;
      const rule = await prisma.rule.findFirst({ where: { id: ruleId, guildId } });
      if (!rule) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Rule not found'));

      const body = RuleTestSchema.parse(request.body);
      const ctx: RuleContext = {
        guildId,
        trigger: rule.trigger as RuleContext['trigger'],
        eventData: body.context,
        content: body.context['content'] as string | undefined,
        userId: body.context['userId'] as string | undefined,
        channelId: body.context['channelId'] as string | undefined,
        roles: body.context['roles'] as string[] | undefined,
      };

      const result = testRule({ conditions: rule.conditions as unknown as RuleCondition[] }, ctx);
      return reply.send(ok({ rule: { id: rule.id, name: rule.name }, ...result }));
    },
  );

  // GET /:guildId/rule-runs
  app.get<{ Params: { guildId: string }; Querystring: Record<string, unknown> }>(
    '/:guildId/rule-runs',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId } = request.params;
      const { page, pageSize } = parsePagination(request.query);
      const [items, total] = await Promise.all([
        prisma.ruleRun.findMany({
          where: { guildId },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { rule: { select: { id: true, name: true } } },
        }),
        prisma.ruleRun.count({ where: { guildId } }),
      ]);
      return reply.send(ok({ items, total, page, pageSize, hasMore: page * pageSize < total }));
    },
  );
};
