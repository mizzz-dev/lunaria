import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog } from '@lunaria/db';
import { ok, err } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';
import { z } from 'zod';

const LevelConfigSchema = z.object({
  enabled: z.boolean().optional(),
  xpPerMessage: z.number().int().min(1).max(1000).optional(),
  xpCooldownSec: z.number().int().min(0).max(3600).optional(),
  levelUpChannelId: z.string().nullable().optional(),
  levelUpMessage: z.string().min(1).max(2000).optional(),
  ignoredChannels: z.array(z.string()).optional(),
  ignoredRoles: z.array(z.string()).optional(),
});

const LevelRewardSchema = z.object({
  level: z.number().int().min(1).max(1000),
  roleId: z.string().min(1),
  removeOnLevel: z.number().int().min(1).nullable().optional(),
});

export const levelRoutes: FastifyPluginAsync = async (app) => {
  // GET /:guildId/levels/config — get level config
  app.get<{ Params: { guildId: string } }>(
    '/:guildId/levels/config',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const config = await prisma.levelConfig.findUnique({ where: { guildId: guild.id } });
      return reply.send(ok(config ?? { guildId: guild.id, enabled: false }));
    },
  );

  // PATCH /:guildId/levels/config — update level config
  app.patch<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/levels/config',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('guild.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const body = LevelConfigSchema.parse(request.body);
      const config = await prisma.levelConfig.upsert({
        where: { guildId: guild.id },
        create: { guildId: guild.id, ...body },
        update: body,
      });

      await createAuditLog({
        guildId: guild.id,
        actorId: request.user.userId,
        action: 'level.config.update',
        targetType: 'level_config',
        targetId: config.id,
        after: body,
      });

      return reply.send(ok(config));
    },
  );

  // GET /:guildId/levels/leaderboard — top 50 users by XP
  app.get<{ Params: { guildId: string } }>(
    '/:guildId/levels/leaderboard',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const top = await prisma.userLevel.findMany({
        where: { guildId: guild.id },
        orderBy: { xp: 'desc' },
        take: 50,
      });

      return reply.send(ok(top));
    },
  );

  // GET /:guildId/levels/me — current user's level
  app.get<{ Params: { guildId: string } }>(
    '/:guildId/levels/me',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const userRecord = await prisma.user.findUnique({ where: { id: request.user.userId } });
      if (!userRecord) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'User not found'));

      const level = await prisma.userLevel.findUnique({
        where: { guildId_userId: { guildId: guild.id, userId: userRecord.discordId } },
      });

      return reply.send(ok(level ?? { guildId: guild.id, userId: userRecord.discordId, xp: 0, level: 0, messages: 0 }));
    },
  );

  // GET /:guildId/levels/rewards — list level rewards
  app.get<{ Params: { guildId: string } }>(
    '/:guildId/levels/rewards',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const rewards = await prisma.levelReward.findMany({
        where: { guildId: guild.id },
        orderBy: { level: 'asc' },
      });

      return reply.send(ok(rewards));
    },
  );

  // POST /:guildId/levels/rewards — create level reward
  app.post<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/levels/rewards',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('guild.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const body = LevelRewardSchema.parse(request.body);
      const reward = await prisma.levelReward.create({
        data: { guildId: guild.id, ...body },
      });

      await createAuditLog({
        guildId: guild.id,
        actorId: request.user.userId,
        action: 'level.reward.create',
        targetType: 'level_reward',
        targetId: reward.id,
        after: body,
      });

      return reply.status(201).send(ok(reward));
    },
  );

  // DELETE /:guildId/levels/rewards/:rewardId — delete level reward
  app.delete<{ Params: { guildId: string; rewardId: string } }>(
    '/:guildId/levels/rewards/:rewardId',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('guild.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, rewardId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const reward = await prisma.levelReward.findFirst({ where: { id: rewardId, guildId: guild.id } });
      if (!reward) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Reward not found'));

      await prisma.levelReward.delete({ where: { id: rewardId } });

      return reply.send(ok({ deleted: true }));
    },
  );
};
