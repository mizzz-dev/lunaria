import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog } from '@lunaria/db';
import { ok, err } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';
import { z } from 'zod';

const ComponentCreateSchema = z.object({
  name: z.string().min(1).max(100),
  componentType: z.enum(['button', 'select']).default('button'),
  label: z.string().min(1).max(80),
  emoji: z.string().max(50).nullable().optional(),
  style: z.enum(['primary', 'secondary', 'success', 'danger']).default('primary'),
  customId: z.string().min(1).max(100),
  actionType: z.enum(['role_add', 'role_remove', 'role_toggle', 'reply']).default('role_toggle'),
  actionConfig: z.record(z.unknown()).default({}),
});

const ComponentUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  label: z.string().min(1).max(80).optional(),
  emoji: z.string().max(50).nullable().optional(),
  style: z.enum(['primary', 'secondary', 'success', 'danger']).optional(),
  actionType: z.enum(['role_add', 'role_remove', 'role_toggle', 'reply']).optional(),
  actionConfig: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

export const componentRoutes: FastifyPluginAsync = async (app) => {
  // GET /:guildId/components
  app.get<{ Params: { guildId: string } }>(
    '/:guildId/components',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const components = await prisma.customComponent.findMany({
        where: { guildId: guild.id },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send(ok(components));
    },
  );

  // POST /:guildId/components
  app.post<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/components',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('guild.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const body = ComponentCreateSchema.parse(request.body);

      const exists = await prisma.customComponent.findUnique({
        where: { guildId_customId: { guildId: guild.id, customId: body.customId } },
      });
      if (exists) return reply.status(409).send(err(ErrorCodes.CONFLICT, 'customId already exists in this guild'));

      const userRecord = await prisma.user.findUnique({ where: { id: request.user.userId } });

      const component = await prisma.customComponent.create({
        data: { guildId: guild.id, ...body, createdBy: userRecord?.discordId ?? null },
      });

      await createAuditLog({
        guildId: guild.id,
        actorId: request.user.userId,
        action: 'component.create',
        targetType: 'custom_component',
        targetId: component.id,
        after: body,
      });

      return reply.status(201).send(ok(component));
    },
  );

  // GET /:guildId/components/:componentId
  app.get<{ Params: { guildId: string; componentId: string } }>(
    '/:guildId/components/:componentId',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId, componentId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const component = await prisma.customComponent.findFirst({ where: { id: componentId, guildId: guild.id } });
      if (!component) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Component not found'));

      return reply.send(ok(component));
    },
  );

  // PATCH /:guildId/components/:componentId
  app.patch<{ Params: { guildId: string; componentId: string }; Body: unknown }>(
    '/:guildId/components/:componentId',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('guild.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, componentId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const component = await prisma.customComponent.findFirst({ where: { id: componentId, guildId: guild.id } });
      if (!component) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Component not found'));

      const body = ComponentUpdateSchema.parse(request.body);
      const updated = await prisma.customComponent.update({
        where: { id: componentId },
        data: body,
      });

      await createAuditLog({
        guildId: guild.id,
        actorId: request.user.userId,
        action: 'component.update',
        targetType: 'custom_component',
        targetId: componentId,
        before: component,
        after: body,
      });

      return reply.send(ok(updated));
    },
  );

  // DELETE /:guildId/components/:componentId
  app.delete<{ Params: { guildId: string; componentId: string } }>(
    '/:guildId/components/:componentId',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('guild.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, componentId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const component = await prisma.customComponent.findFirst({ where: { id: componentId, guildId: guild.id } });
      if (!component) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Component not found'));

      await prisma.customComponent.delete({ where: { id: componentId } });

      await createAuditLog({
        guildId: guild.id,
        actorId: request.user.userId,
        action: 'component.delete',
        targetType: 'custom_component',
        targetId: componentId,
        before: component,
      });

      return reply.send(ok({ deleted: true }));
    },
  );
};
