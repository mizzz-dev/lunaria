import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog } from '@lunaria/db';
import { ok, err, parsePagination, shuffle } from '@lunaria/shared';
import { TeamSplitCreateSchema } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';

export const teamSplitRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { guildId: string }; Querystring: Record<string, unknown> }>(
    '/:guildId/team-splits', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId } = request.params;
      const { page, pageSize } = parsePagination(request.query);
      const [items, total] = await Promise.all([
        prisma.teamSet.findMany({ where: { guildId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { teams: { include: { members: true } } } }),
        prisma.teamSet.count({ where: { guildId } }),
      ]);
      return reply.send(ok({ items, total, page, pageSize, hasMore: page * pageSize < total }));
    },
  );

  async function createTeams(guildId: string, body: { name: string; splitMode: string; teamCount: number; playerIds: string[] }, actorId: string) {
    const shuffled = shuffle(body.playerIds);
    const teams: { name: string; position: number; members: { userId: string }[] }[] = [];
    const teamCount = Math.min(body.teamCount, shuffled.length);
    for (let i = 0; i < teamCount; i++) {
      teams.push({ name: `Team ${i + 1}`, position: i, members: [] });
    }
    // Distribute players round-robin
    shuffled.forEach((playerId, idx) => {
      const team = teams[idx % teamCount];
      if (team) team.members.push({ userId: playerId });
    });

    const teamSet = await prisma.teamSet.create({
      data: {
        guildId,
        name: body.name,
        splitMode: body.splitMode,
        teamCount,
        createdBy: actorId,
        teams: { create: teams.map((t) => ({ name: t.name, position: t.position, members: { create: t.members } })) },
      },
      include: { teams: { include: { members: true } } },
    });
    return teamSet;
  }

  app.post<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/team-splits', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('team.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const body = TeamSplitCreateSchema.parse(request.body);
      const teamSet = await createTeams(guildId, body, request.user.discordId);
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'team_split.create', targetType: 'team_set', targetId: teamSet.id });
      return reply.status(201).send(ok(teamSet));
    },
  );

  app.get<{ Params: { guildId: string; teamSetId: string } }>(
    '/:guildId/team-splits/:teamSetId', { preHandler: app.authenticate }, async (request, reply) => {
      const { guildId, teamSetId } = request.params;
      const teamSet = await prisma.teamSet.findFirst({ where: { id: teamSetId, guildId }, include: { teams: { include: { members: true } } } });
      if (!teamSet) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Team set not found'));
      return reply.send(ok(teamSet));
    },
  );

  app.post<{ Params: { guildId: string; teamSetId: string } }>(
    '/:guildId/team-splits/:teamSetId/reroll', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('team.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, teamSetId } = request.params;
      const teamSet = await prisma.teamSet.findFirst({ where: { id: teamSetId, guildId }, include: { teams: { include: { members: true } } } });
      if (!teamSet) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Team set not found'));

      const allPlayers = teamSet.teams.flatMap((t) => t.members.map((m) => m.userId));
      // Delete existing teams and recreate
      await prisma.team.deleteMany({ where: { teamSetId } });
      const shuffled = shuffle(allPlayers);
      const teamCount = teamSet.teamCount;
      const newTeams: { name: string; position: number; members: { userId: string }[] }[] = [];
      for (let i = 0; i < teamCount; i++) newTeams.push({ name: `Team ${i + 1}`, position: i, members: [] });
      shuffled.forEach((playerId, idx) => { const t = newTeams[idx % teamCount]; if (t) t.members.push({ userId: playerId }); });

      const updated = await prisma.teamSet.update({
        where: { id: teamSetId },
        data: { teams: { create: newTeams.map((t) => ({ name: t.name, position: t.position, members: { create: t.members } })) } },
        include: { teams: { include: { members: true } } },
      });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'team_split.reroll', targetType: 'team_set', targetId: teamSetId });
      return reply.send(ok(updated));
    },
  );

  app.post<{ Params: { guildId: string; teamSetId: string } }>(
    '/:guildId/team-splits/:teamSetId/dissolve', { preHandler: app.authenticate }, async (request, reply) => {
      const perm = app.requirePermission('team.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, teamSetId } = request.params;
      const teamSet = await prisma.teamSet.findFirst({ where: { id: teamSetId, guildId } });
      if (!teamSet) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Team set not found'));

      const updated = await prisma.teamSet.update({ where: { id: teamSetId }, data: { status: 'dissolved' } });
      await createAuditLog({ guildId, actorId: request.user.userId, action: 'team_split.dissolve', targetType: 'team_set', targetId: teamSetId });
      return reply.send(ok(updated));
    },
  );
};
