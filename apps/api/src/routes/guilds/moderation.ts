import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog, Prisma } from '@lunaria/db';
import { ok, err, parsePagination } from '@lunaria/shared';
import { ModerationRuleCreateSchema, ModerationRuleUpdateSchema, ModerationActionCreateSchema } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';

export const moderationRoutes: FastifyPluginAsync = async (app) => {
  // Moderation Rules
  app.get<{ Params: { guildId: string }; Querystring: Record<string, unknown> }>(
    '/:guildId/moderation/rules', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId } = request.params;
      const rules = await prisma.moderationRule.findMany({ where: { guildId }, orderBy: { createdAt: 'desc' } });
      return reply.send(ok(rules));
    },
  );

  app.post<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/moderation/rules', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('moderation.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const body = ModerationRuleCreateSchema.parse(request.body);
      const rule = await prisma.moderationRule.create({
        data: {
          guildId,
          name: body.name,
          enabled: body.enabled,
          ruleType: body.ruleType,
          config: body.config as unknown as Prisma.InputJsonValue,
          action: body.action,
          actionConfig: body.actionConfig as unknown as Prisma.InputJsonValue,
        },
      });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'moderation.rule.create', targetType: 'moderation_rule', targetId: rule.id, after: rule });
      return reply.status(201).send(ok(rule));
    },
  );

  app.get<{ Params: { guildId: string; id: string } }>(
    '/:guildId/moderation/rules/:id', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, id } = request.params;
      const rule = await prisma.moderationRule.findFirst({ where: { id, guildId } });
      if (!rule) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Moderation rule not found'));
      return reply.send(ok(rule));
    },
  );

  app.patch<{ Params: { guildId: string; id: string }; Body: unknown }>(
    '/:guildId/moderation/rules/:id', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('moderation.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, id } = request.params;
      const existing = await prisma.moderationRule.findFirst({ where: { id, guildId } });
      if (!existing) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Moderation rule not found'));

      const body = ModerationRuleUpdateSchema.parse(request.body);
      const updated = await prisma.moderationRule.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
          ...(body.ruleType !== undefined ? { ruleType: body.ruleType } : {}),
          ...(body.action !== undefined ? { action: body.action } : {}),
          ...(body.config !== undefined ? { config: body.config as unknown as Prisma.InputJsonValue } : {}),
          ...(body.actionConfig !== undefined ? { actionConfig: body.actionConfig as unknown as Prisma.InputJsonValue } : {}),
        },
      });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'moderation.rule.update', targetType: 'moderation_rule', targetId: id, before: existing, after: updated });
      return reply.send(ok(updated));
    },
  );

  app.delete<{ Params: { guildId: string; id: string } }>(
    '/:guildId/moderation/rules/:id', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('moderation.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, id } = request.params;
      const existing = await prisma.moderationRule.findFirst({ where: { id, guildId } });
      if (!existing) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Moderation rule not found'));
      await prisma.moderationRule.delete({ where: { id } });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'moderation.rule.delete', targetType: 'moderation_rule', targetId: id });
      return reply.send(ok({ deleted: true }));
    },
  );

  // Moderation Actions
  app.get<{ Params: { guildId: string }; Querystring: Record<string, unknown> }>(
    '/:guildId/moderation/actions', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('moderation.view');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const { page, pageSize } = parsePagination(request.query);
      const targetId = request.query['targetId'] as string | undefined;
      const [items, total] = await Promise.all([
        prisma.moderationAction.findMany({ where: { guildId, ...(targetId ? { targetId } : {}) }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.moderationAction.count({ where: { guildId, ...(targetId ? { targetId } : {}) } }),
      ]);
      return reply.send(ok({ items, total, page, pageSize, hasMore: page * pageSize < total }));
    },
  );

  app.post<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/moderation/actions', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('moderation.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const body = ModerationActionCreateSchema.parse(request.body);
      const action = await prisma.moderationAction.create({
        data: { guildId, ...body, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null, moderatorId: request.user.discordId },
      });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'moderation.action.create', targetType: 'moderation_action', targetId: action.id, after: action });
      return reply.status(201).send(ok(action));
    },
  );
};
