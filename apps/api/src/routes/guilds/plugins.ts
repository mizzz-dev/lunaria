import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog, saveConfigVersion, Prisma } from '@lunaria/db';
import { ok, err, configScope } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';
import { PLUGIN_DEFINITIONS } from '@lunaria/plugin-sdk';
import { z } from 'zod';

const ConfigUpdateSchema = z.object({ config: z.record(z.unknown()) });

export const pluginRoutes: FastifyPluginAsync = async (app) => {
  // GET /:guildId/plugins - list all plugins with guild status
  app.get<{ Params: { guildId: string } }>('/:guildId/plugins', { preHandler: app.authenticate }, async (request, reply) => {
    const { guildId } = request.params;
    const settings = await prisma.guildPluginSetting.findMany({
      where: { guildId },
      include: { plugin: true },
    });
    const settingsMap = new Map(settings.map((s) => [s.plugin.pluginKey, s]));

    const result = Object.values(PLUGIN_DEFINITIONS).map((def) => {
      const setting = settingsMap.get(def.pluginKey);
      return {
        pluginKey: def.pluginKey,
        name: def.name,
        description: def.description,
        version: def.version,
        billingTier: def.billingTier,
        isStub: def.isStub ?? false,
        stubNote: def.stubNote ?? null,
        enabled: setting?.enabled ?? false,
        config: (setting?.config as Record<string, unknown>) ?? {},
      };
    });

    return reply.send(ok(result));
  });

  // GET /:guildId/plugins/:pluginKey
  app.get<{ Params: { guildId: string; pluginKey: string } }>('/:guildId/plugins/:pluginKey', { preHandler: app.authenticate }, async (request, reply) => {
    const { guildId, pluginKey } = request.params;
    const def = PLUGIN_DEFINITIONS[pluginKey];
    if (!def) return reply.status(404).send(err(ErrorCodes.PLUGIN_NOT_FOUND, 'Plugin not found'));

    const plugin = await prisma.plugin.findUnique({ where: { pluginKey } });
    const setting = plugin
      ? await prisma.guildPluginSetting.findUnique({ where: { guildId_pluginId: { guildId, pluginId: plugin.id } } })
      : null;

    return reply.send(ok({
      ...def,
      enabled: setting?.enabled ?? false,
      config: (setting?.config as Record<string, unknown>) ?? {},
    }));
  });

  // PATCH /:guildId/plugins/:pluginKey - update config
  app.patch<{ Params: { guildId: string; pluginKey: string }; Body: z.infer<typeof ConfigUpdateSchema> }>(
    '/:guildId/plugins/:pluginKey',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { guildId, pluginKey } = request.params;
      const perm = app.requirePermission('plugin.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const def = PLUGIN_DEFINITIONS[pluginKey];
      if (!def) return reply.status(404).send(err(ErrorCodes.PLUGIN_NOT_FOUND, 'Plugin not found'));

      const { config } = ConfigUpdateSchema.parse(request.body);
      const plugin = await prisma.plugin.findUnique({ where: { pluginKey } });
      if (!plugin) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Plugin record not found'));

      const setting = await prisma.guildPluginSetting.upsert({
        where: { guildId_pluginId: { guildId, pluginId: plugin.id } },
        create: { guildId, pluginId: plugin.id, enabled: false, config: config as unknown as Prisma.InputJsonValue },
        update: { config: config as unknown as Prisma.InputJsonValue },
      });

      await Promise.all([
        createAuditLog({ guildId, actorId: request.user.userId, action: 'plugin.config.update', targetType: 'plugin', targetId: pluginKey, after: config }),
        saveConfigVersion({ guildId, scope: configScope('plugin', pluginKey), snapshot: setting, changedBy: request.user.userId }),
      ]);

      return reply.send(ok(setting));
    },
  );

  async function setPluginEnabled(guildId: string, pluginKey: string, enabled: boolean, actorId: string) {
    const def = PLUGIN_DEFINITIONS[pluginKey];
    if (!def) return null;

    let plugin = await prisma.plugin.findUnique({ where: { pluginKey } });
    if (!plugin) {
      plugin = await prisma.plugin.create({
        data: {
          pluginKey,
          name: def.name,
          description: def.description,
          version: def.version,
          configSchema: def.configSchema as unknown as Prisma.InputJsonValue,
          auditEvents: def.auditEvents,
          billingTier: def.billingTier,
        },
      });
    }

    const setting = await prisma.guildPluginSetting.upsert({
      where: { guildId_pluginId: { guildId, pluginId: plugin.id } },
      create: { guildId, pluginId: plugin.id, enabled, config: {} as Prisma.InputJsonValue },
      update: { enabled },
    });

    await Promise.all([
      createAuditLog({ guildId, actorId, action: enabled ? 'plugin.enable' : 'plugin.disable', targetType: 'plugin', targetId: pluginKey }),
      saveConfigVersion({ guildId, scope: configScope('plugin', pluginKey), snapshot: setting, changedBy: actorId }),
    ]);

    return setting;
  }

  // POST /:guildId/plugins/:pluginKey/enable
  app.post<{ Params: { guildId: string; pluginKey: string } }>(
    '/:guildId/plugins/:pluginKey/enable',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('plugin.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, pluginKey } = request.params;
      if (!PLUGIN_DEFINITIONS[pluginKey]) return reply.status(404).send(err(ErrorCodes.PLUGIN_NOT_FOUND, 'Plugin not found'));

      const setting = await setPluginEnabled(guildId, pluginKey, true, request.user.userId);
      return reply.send(ok(setting));
    },
  );

  // POST /:guildId/plugins/:pluginKey/disable
  app.post<{ Params: { guildId: string; pluginKey: string } }>(
    '/:guildId/plugins/:pluginKey/disable',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const perm = app.requirePermission('plugin.manage');
      await perm(request, reply);
      if (reply.sent) return;

      const { guildId, pluginKey } = request.params;
      if (!PLUGIN_DEFINITIONS[pluginKey]) return reply.status(404).send(err(ErrorCodes.PLUGIN_NOT_FOUND, 'Plugin not found'));

      const setting = await setPluginEnabled(guildId, pluginKey, false, request.user.userId);
      return reply.send(ok(setting));
    },
  );
};
