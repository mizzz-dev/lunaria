import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog } from '@lunaria/db';
import { ok, err, parsePagination } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';
import { z } from 'zod';

const AssignRolesSchema = z.object({ roleIds: z.array(z.string()) });

export const membershipRoutes: FastifyPluginAsync = async (app) => {
  // GET /:guildId/roles - list RBAC roles
  app.get<{ Params: { guildId: string } }>(
    '/:guildId/roles', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId } = request.params;
      const roles = await prisma.rbacRole.findMany({
        where: { guildId },
        include: { permissions: { include: { permission: true } } },
      });
      return reply.send(ok(roles));
    },
  );

  // GET /:guildId/memberships
  app.get<{ Params: { guildId: string }; Querystring: Record<string, unknown> }>(
    '/:guildId/memberships', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId } = request.params;
      const { page, pageSize } = parsePagination(request.query);
      const [items, total] = await Promise.all([
        prisma.guildMembership.findMany({
          where: { guildId },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            user: { select: { id: true, discordId: true, username: true, avatar: true } },
            roleAssignments: { include: { role: { select: { id: true, name: true } } } },
          },
        }),
        prisma.guildMembership.count({ where: { guildId } }),
      ]);
      return reply.send(ok({ items, total, page, pageSize, hasMore: page * pageSize < total }));
    },
  );

  // GET /:guildId/memberships/:membershipId
  app.get<{ Params: { guildId: string; membershipId: string } }>(
    '/:guildId/memberships/:membershipId', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, membershipId } = request.params;
      const membership = await prisma.guildMembership.findFirst({
        where: { id: membershipId, guildId },
        include: {
          user: { select: { id: true, discordId: true, username: true, avatar: true } },
          roleAssignments: { include: { role: true } },
        },
      });
      if (!membership) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Membership not found'));
      return reply.send(ok(membership));
    },
  );

  // PATCH /:guildId/memberships/:membershipId - assign RBAC roles
  app.patch<{ Params: { guildId: string; membershipId: string }; Body: unknown }>(
    '/:guildId/memberships/:membershipId', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('rbac.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, membershipId } = request.params;
      const membership = await prisma.guildMembership.findFirst({ where: { id: membershipId, guildId }, include: { user: true } });
      if (!membership) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Membership not found'));

      const { roleIds } = AssignRolesSchema.parse(request.body);

      // Validate all roles belong to this guild
      const roles = await prisma.rbacRole.findMany({ where: { id: { in: roleIds }, guildId } });
      if (roles.length !== roleIds.length) return reply.status(400).send(err(ErrorCodes.VALIDATION_ERROR, 'One or more roles not found in this guild'));

      // Replace assignments
      await prisma.guildMemberRoleAssignment.deleteMany({ where: { membershipId } });
      if (roleIds.length > 0) {
        await prisma.guildMemberRoleAssignment.createMany({
          data: roleIds.map((roleId) => ({
            membershipId,
            roleId,
            userId: membership.userId,
            assignedBy: request.user.userId,
          })),
        });
      }

      await createAuditLog({
        guildId,
        actorId: request.user.userId,
        action: 'rbac.member.roles.update',
        targetType: 'membership',
        targetId: membershipId,
        after: { roleIds },
      });

      return reply.send(ok({ membershipId, roleIds }));
    },
  );
};
