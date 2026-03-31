import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog } from '@lunaria/db';
import { ok, err } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';
import { z } from 'zod';

const PollRewardSchema = z.object({
  optionId: z.string().min(1),
  roleId: z.string().min(1),
});

export const pollRewardRoutes: FastifyPluginAsync = async (app) => {
  // GET /:guildId/polls/:pollId/rewards
  app.get<{ Params: { guildId: string; pollId: string } }>(
    '/:guildId/polls/:pollId/rewards',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId, pollId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const poll = await prisma.poll.findFirst({ where: { id: pollId, guildId: guild.id } });
      if (!poll) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Poll not found'));

      const rewards = await prisma.pollRoleReward.findMany({
        where: { pollId },
        include: { option: true },
      });

      return reply.send(ok(rewards));
    },
  );

  // POST /:guildId/polls/:pollId/rewards — add role reward for a winning option
  app.post<{ Params: { guildId: string; pollId: string }; Body: unknown }>(
    '/:guildId/polls/:pollId/rewards',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('poll.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, pollId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const poll = await prisma.poll.findFirst({ where: { id: pollId, guildId: guild.id } });
      if (!poll) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Poll not found'));

      const body = PollRewardSchema.parse(request.body);

      const option = await prisma.pollOption.findFirst({ where: { id: body.optionId, pollId } });
      if (!option) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Poll option not found'));

      const reward = await prisma.pollRoleReward.create({
        data: { pollId, optionId: body.optionId, roleId: body.roleId },
      });

      await createAuditLog({
        guildId: guild.id,
        actorId: request.user.userId,
        action: 'poll.reward.create',
        targetType: 'poll',
        targetId: pollId,
        after: body,
      });

      return reply.status(201).send(ok(reward));
    },
  );

  // DELETE /:guildId/polls/:pollId/rewards/:rewardId
  app.delete<{ Params: { guildId: string; pollId: string; rewardId: string } }>(
    '/:guildId/polls/:pollId/rewards/:rewardId',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('poll.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, pollId, rewardId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const reward = await prisma.pollRoleReward.findFirst({ where: { id: rewardId, pollId } });
      if (!reward) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Reward not found'));

      await prisma.pollRoleReward.delete({ where: { id: rewardId } });

      return reply.send(ok({ deleted: true }));
    },
  );
};
