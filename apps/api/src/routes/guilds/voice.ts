import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog } from '@lunaria/db';
import { ok, err } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';
import { z } from 'zod';

const TempVcConfigSchema = z.object({
  enabled: z.boolean().optional(),
  triggerChannelId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  nameTemplate: z.string().min(1).max(100).optional(),
  maxChannels: z.number().int().min(1).max(50).optional(),
});

const VoiceLogConfigSchema = z.object({
  enabled: z.boolean().optional(),
  channelId: z.string().nullable().optional(),
  logJoin: z.boolean().optional(),
  logLeave: z.boolean().optional(),
  logMove: z.boolean().optional(),
});

export const voiceRoutes: FastifyPluginAsync = async (app) => {
  // ── Temp VC ─────────────────────────────────────────

  // GET /:guildId/voice/temp-vc/config
  app.get<{ Params: { guildId: string } }>(
    '/:guildId/voice/temp-vc/config',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const config = await prisma.tempVcConfig.findUnique({ where: { guildId: guild.id } });
      return reply.send(ok(config ?? { guildId: guild.id, enabled: false }));
    },
  );

  // PATCH /:guildId/voice/temp-vc/config
  app.patch<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/voice/temp-vc/config',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('guild.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const body = TempVcConfigSchema.parse(request.body);
      const config = await prisma.tempVcConfig.upsert({
        where: { guildId: guild.id },
        create: { guildId: guild.id, ...body },
        update: body,
      });

      await createAuditLog({
        guildId: guild.id,
        actorId: request.user.userId,
        action: 'temp_vc.config.update',
        targetType: 'temp_vc_config',
        targetId: config.id,
        after: body,
      });

      return reply.send(ok(config));
    },
  );

  // GET /:guildId/voice/temp-vc/channels — active temp VC list
  app.get<{ Params: { guildId: string } }>(
    '/:guildId/voice/temp-vc/channels',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const channels = await prisma.tempVoiceChannel.findMany({
        where: { guildId: guild.id },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send(ok(channels));
    },
  );

  // ── Voice Log ────────────────────────────────────────

  // GET /:guildId/voice/log/config
  app.get<{ Params: { guildId: string } }>(
    '/:guildId/voice/log/config',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const config = await prisma.voiceLogConfig.findUnique({ where: { guildId: guild.id } });
      return reply.send(ok(config ?? { guildId: guild.id, enabled: false }));
    },
  );

  // PATCH /:guildId/voice/log/config
  app.patch<{ Params: { guildId: string }; Body: unknown }>(
    '/:guildId/voice/log/config',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('guild.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId } = request.params;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const body = VoiceLogConfigSchema.parse(request.body);
      const config = await prisma.voiceLogConfig.upsert({
        where: { guildId: guild.id },
        create: { guildId: guild.id, ...body },
        update: body,
      });

      await createAuditLog({
        guildId: guild.id,
        actorId: request.user.userId,
        action: 'voice_log.config.update',
        targetType: 'voice_log_config',
        targetId: config.id,
        after: body,
      });

      return reply.send(ok(config));
    },
  );

  // GET /:guildId/voice/log/history
  app.get<{
    Params: { guildId: string };
    Querystring: { userId?: string; eventType?: string; page?: string; pageSize?: string };
  }>(
    '/:guildId/voice/log/history',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId } = request.params;
      const { userId, eventType, page = '1', pageSize = '50' } = request.query;
      const guild = await prisma.guild.findUnique({ where: { discordId: guildId } });
      if (!guild) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Guild not found'));

      const where = {
        guildId: guild.id,
        ...(userId ? { userId } : {}),
        ...(eventType ? { eventType } : {}),
      };

      const skip = (Number(page) - 1) * Number(pageSize);
      const [logs, total] = await Promise.all([
        prisma.voiceLog.findMany({ where, orderBy: { occurredAt: 'desc' }, skip, take: Number(pageSize) }),
        prisma.voiceLog.count({ where }),
      ]);

      return reply.send(ok({ logs, total, page: Number(page), pageSize: Number(pageSize) }));
    },
  );
};
