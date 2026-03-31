import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@lunaria/db';
import { ok, err } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';
import { z } from 'zod';

const GroupCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  joinMode: z.enum(['open', 'invite_only']).default('invite_only'),
  ownerGuildDiscordId: z.string().min(1),
});

const BroadcastSchema = z.object({
  content: z.string().min(1).max(2000),
  embedData: z.record(z.unknown()).nullable().optional(),
  // Map of guildDiscordId -> channelId to send to
  targets: z.array(z.object({ guildDiscordId: z.string(), channelId: z.string() })),
});

export const guildGroupRoutes: FastifyPluginAsync = async (app) => {
  // GET /guild-groups — list groups the user's guilds belong to
  app.get(
    '/guild-groups',
    { preHandler: app.authenticate },
    async (_request, reply) => {
      const groups = await prisma.guildGroup.findMany({
        include: { members: true, _count: { select: { broadcasts: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return reply.send(ok(groups));
    },
  );

  // POST /guild-groups — create group
  app.post<{ Body: unknown }>(
    '/guild-groups',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const body = GroupCreateSchema.parse(request.body);

      const ownerGuild = await prisma.guild.findUnique({ where: { discordId: body.ownerGuildDiscordId } });
      if (!ownerGuild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Owner guild not found'));

      const group = await prisma.guildGroup.create({
        data: {
          name: body.name,
          description: body.description,
          ownerGuildId: ownerGuild.id,
          joinMode: body.joinMode,
          members: {
            create: { guildId: ownerGuild.id, role: 'owner' },
          },
        },
      });

      return reply.status(201).send(ok(group));
    },
  );

  // GET /guild-groups/:groupId
  app.get<{ Params: { groupId: string } }>(
    '/guild-groups/:groupId',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const group = await prisma.guildGroup.findUnique({
        where: { id: request.params.groupId },
        include: { members: true },
      });
      if (!group) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Group not found'));
      return reply.send(ok(group));
    },
  );

  // POST /guild-groups/:groupId/join — join via invite code
  app.post<{ Params: { groupId: string }; Body: unknown }>(
    '/guild-groups/:groupId/join',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const body = z.object({ guildDiscordId: z.string(), inviteCode: z.string() }).parse(request.body);
      const group = await prisma.guildGroup.findFirst({
        where: { id: request.params.groupId, inviteCode: body.inviteCode },
      });
      if (!group) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Group not found or invalid invite code'));

      const guild = await prisma.guild.findUnique({ where: { discordId: body.guildDiscordId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const existing = await prisma.guildGroupMember.findUnique({
        where: { groupId_guildId: { groupId: group.id, guildId: guild.id } },
      });
      if (existing) return reply.status(409).send(err(ErrorCodes.CONFLICT, 'Guild is already a member of this group'));

      const member = await prisma.guildGroupMember.create({
        data: { groupId: group.id, guildId: guild.id, role: 'member' },
      });

      return reply.status(201).send(ok(member));
    },
  );

  // POST /guild-groups/:groupId/broadcast — broadcast message to all member guilds
  app.post<{ Params: { groupId: string }; Body: unknown }>(
    '/guild-groups/:groupId/broadcast',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const body = BroadcastSchema.parse(request.body);
      const group = await prisma.guildGroup.findUnique({ where: { id: request.params.groupId } });
      if (!group) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Group not found'));

      const userRecord = await prisma.user.findUnique({ where: { id: request.user.userId } });

      const broadcast = await prisma.crossServerBroadcast.create({
        data: {
          groupId: group.id,
          fromGuildId: group.ownerGuildId,
          content: body.content,
          embedData: body.embedData ?? null,
          sentBy: userRecord?.discordId ?? null,
          targets: {
            create: body.targets.map((t) => ({
              guildId: t.guildDiscordId,
              channelId: t.channelId,
            })),
          },
        },
      });

      // Enqueue broadcast job (fire-and-forget via direct update — bot worker picks up pending targets)
      return reply.status(201).send(ok(broadcast));
    },
  );

  // GET /guild-groups/:groupId/broadcasts
  app.get<{ Params: { groupId: string }; Querystring: { page?: string; pageSize?: string } }>(
    '/guild-groups/:groupId/broadcasts',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { page = '1', pageSize = '20' } = request.query;
      const skip = (Number(page) - 1) * Number(pageSize);

      const [broadcasts, total] = await Promise.all([
        prisma.crossServerBroadcast.findMany({
          where: { groupId: request.params.groupId },
          include: { targets: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(pageSize),
        }),
        prisma.crossServerBroadcast.count({ where: { groupId: request.params.groupId } }),
      ]);

      return reply.send(ok({ broadcasts, total, page: Number(page), pageSize: Number(pageSize) }));
    },
  );
};
