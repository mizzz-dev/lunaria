import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog } from '@lunaria/db';
import { ok, err } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';
import { z } from 'zod';

const RoleCreateSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  permissionKeys: z.array(z.string()).default([]),
});

const RoleUpdateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
  permissionKeys: z.array(z.string()).optional(),
});

export const roleRoutes: FastifyPluginAsync = async (app) => {
  // POST /:guildId/roles — create custom RBAC role
  app.post<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/roles',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('rbac.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const body = RoleCreateSchema.parse(request.body);

      // Prevent duplicate name
      const exists = await prisma.rbacRole.findUnique({ where: { guildId_name: { guildId, name: body.name } } });
      if (exists) return reply.status(409).send(err(ErrorCodes.CONFLICT, 'Role name already exists in this guild'));

      // Resolve permission IDs
      const permissions = await prisma.rbacPermission.findMany({ where: { key: { in: body.permissionKeys } } });

      const role = await prisma.rbacRole.create({
        data: {
          guildId,
          name: body.name,
          description: body.description,
          isSystem: false,
          permissions: {
            create: permissions.map((p) => ({ permissionId: p.id })),
          },
        },
        include: { permissions: { include: { permission: true } } },
      });

      await createAuditLog({
        guildId,
        actorId: request.user.userId,
        action: 'rbac.role.create',
        targetType: 'rbac_role',
        targetId: role.id,
        after: { name: role.name, permissionKeys: body.permissionKeys },
      });

      return reply.status(201).send(ok(role));
    },
  );

  // PATCH /:guildId/roles/:roleId — update role name/description/permissions
  app.patch<{ Params: { guildId: string; roleId: string }; Body: unknown }>(
    '/:guildId/roles/:roleId',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('rbac.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, roleId } = request.params;
      const role = await prisma.rbacRole.findFirst({ where: { id: roleId, guildId } });
      if (!role) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Role not found'));
      if (role.isSystem) return reply.status(403).send(err(ErrorCodes.FORBIDDEN, 'System roles cannot be modified'));

      const body = RoleUpdateSchema.parse(request.body);

      const updated = await prisma.rbacRole.update({
        where: { id: roleId },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
        },
      });

      if (body.permissionKeys !== undefined) {
        const permissions = await prisma.rbacPermission.findMany({ where: { key: { in: body.permissionKeys } } });
        await prisma.rbacRolePermission.deleteMany({ where: { roleId } });
        if (permissions.length > 0) {
          await prisma.rbacRolePermission.createMany({
            data: permissions.map((p) => ({ roleId, permissionId: p.id })),
          });
        }
      }

      await createAuditLog({
        guildId,
        actorId: request.user.userId,
        action: 'rbac.role.update',
        targetType: 'rbac_role',
        targetId: roleId,
        before: role,
        after: body,
      });

      return reply.send(ok(updated));
    },
  );

  // DELETE /:guildId/roles/:roleId — delete custom role
  app.delete<{ Params: { guildId: string; roleId: string } }>(
    '/:guildId/roles/:roleId',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('rbac.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, roleId } = request.params;
      const role = await prisma.rbacRole.findFirst({ where: { id: roleId, guildId } });
      if (!role) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Role not found'));
      if (role.isSystem) return reply.status(403).send(err(ErrorCodes.FORBIDDEN, 'System roles cannot be deleted'));

      await prisma.rbacRole.delete({ where: { id: roleId } });

      await createAuditLog({
        guildId,
        actorId: request.user.userId,
        action: 'rbac.role.delete',
        targetType: 'rbac_role',
        targetId: roleId,
        before: role,
      });

      return reply.send(ok({ deleted: true }));
    },
  );
};
