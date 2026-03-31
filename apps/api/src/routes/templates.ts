import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog, Prisma } from '@lunaria/db';
import { ok, err, parsePagination } from '@lunaria/shared';
import { TemplateCreateSchema } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';

export const templateRoutes: FastifyPluginAsync = async (app) => {
  // GET /templates - list public templates
  app.get<{ Querystring: Record<string, unknown> }>(
    '/templates', { preHandler: app.authenticate }, async (request, reply) => {
      const { page, pageSize } = parsePagination(request.query);
      const category = request.query['category'] as string | undefined;

      const where = {
        OR: [
          { visibility: 'official' as const },
          { visibility: 'community' as const },
          { guildId: null },
        ],
        ...(category ? { category } : {}),
      };

      const [items, total] = await Promise.all([
        prisma.template.findMany({ where, orderBy: { useCount: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.template.count({ where }),
      ]);
      return reply.send(ok({ items, total, page, pageSize, hasMore: page * pageSize < total }));
    },
  );

  // POST /guilds/:guildId/templates - create guild-private template
  app.post<{ Params: { guildId: string }; Body: unknown }>(
    '/guilds/:guildId/templates', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('template.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const body = TemplateCreateSchema.parse(request.body);
      const template = await prisma.template.create({
        data: {
          guildId,
          createdBy: request.user.userId,
          name: body.name,
          description: body.description,
          category: body.category,
          visibility: body.visibility,
          tags: body.tags,
          body: body.body as unknown as Prisma.InputJsonValue,
        },
      });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'template.create', targetType: 'template', targetId: template.id });
      return reply.status(201).send(ok(template));
    },
  );

  // POST /guilds/:guildId/templates/:templateId/apply
  app.post<{ Params: { guildId: string; templateId: string } }>(
    '/guilds/:guildId/templates/:templateId/apply', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('template.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, templateId } = request.params;
      const template = await prisma.template.findUnique({ where: { id: templateId } });
      if (!template) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Template not found'));

      let resultId: string | null = null;
      let resultType: string | null = null;

      if (template.category === 'rule') {
        const body = template.body as Record<string, unknown>;
        const rule = await prisma.rule.create({
          data: {
            guildId,
            name: `${template.name} (from template)`,
            description: body['description'] as string | undefined,
            trigger: (body['trigger'] as string) ?? 'messageCreate',
            triggerConfig: ((body['triggerConfig'] as Record<string, unknown>) ?? {}) as Prisma.InputJsonValue,
            conditions: ((body['conditions'] as unknown[]) ?? []) as unknown as Prisma.InputJsonValue,
            actions: ((body['actions'] as unknown[]) ?? []) as unknown as Prisma.InputJsonValue,
            priority: (body['priority'] as number) ?? 0,
            createdBy: request.user.userId,
          },
        });
        resultId = rule.id;
        resultType = 'rule';
      } else if (template.category === 'auto_response') {
        const body = template.body as Record<string, unknown>;
        const ar = await prisma.autoResponse.create({
          data: {
            guildId,
            name: `${template.name} (from template)`,
            matchType: (body['matchType'] as string) ?? 'keyword',
            pattern: (body['pattern'] as string) ?? '',
            responseType: (body['responseType'] as string) ?? 'reply',
            response: (body['response'] as string) ?? '',
            createdBy: request.user.userId,
          },
        });
        resultId = ar.id;
        resultType = 'auto_response';
      }

      const application = await prisma.templateApplication.create({
        data: { templateId, guildId, appliedBy: request.user.userId, resultId, resultType },
      });
      await prisma.template.update({ where: { id: templateId }, data: { useCount: { increment: 1 } } });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'template.apply', targetType: 'template', targetId: templateId, metadata: { resultId, resultType } });

      return reply.send(ok({ application, resultId, resultType }));
    },
  );
};
