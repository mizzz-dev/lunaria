import type { FastifyPluginAsync } from 'fastify';
import { prisma, createAuditLog, saveConfigVersion, hasPermission } from '@lunaria/db';
import { ok } from '@lunaria/shared';

interface LayoutState {
  order: string[];
  hidden: string[];
  updatedAt: string;
}

const widgetRegistry = [
  { key: 'members', label: 'Members', permission: 'analytics.view' },
  { key: 'plugins', label: 'Active Plugins', permission: 'plugin.view' },
  { key: 'rules', label: 'Rules', permission: 'rule.view' },
  { key: 'audit', label: 'Recent Audit Logs', permission: 'audit.view' },
] as const;

const defaultLayout: LayoutState = {
  order: widgetRegistry.map((w) => w.key),
  hidden: [],
  updatedAt: new Date(0).toISOString(),
};

export const dashboardLayoutRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { guildId: string } }>('/:guildId/dashboard/widgets', { preHandler: app.authenticate }, async (request, reply) => {
    const { guildId } = request.params;
    const visible: Array<{ key: string; label: string; permission: string }> = [];
    for (const widget of widgetRegistry) {
      const allowed = await hasPermission(request.user.userId, guildId, widget.permission);
      if (allowed) visible.push(widget);
    }

    return reply.send(ok({ guildId, widgets: visible }));
  });

  app.get<{ Params: { guildId: string } }>('/:guildId/dashboard/layout', { preHandler: app.authenticate }, async (request, reply) => {
    const perm = app.requirePermission('analytics.view');
    await perm(request, reply);
    if (reply.sent) return;

    const { guildId } = request.params;
    const guild = await prisma.guild.findUnique({ where: { id: guildId }, select: { dashboardLayout: true } });
    return reply.send(ok(guild?.dashboardLayout ?? defaultLayout));
  });

  app.put<{ Params: { guildId: string }; Body: LayoutState }>('/:guildId/dashboard/layout', { preHandler: app.authenticate }, async (request, reply) => {
    const perm = app.requirePermission('config.manage');
    await perm(request, reply);
    if (reply.sent) return;

    const { guildId } = request.params;
    const payload = request.body;

    const nextLayout: LayoutState = {
      order: Array.from(new Set(payload.order)).filter((key) => widgetRegistry.some((w) => w.key === key)),
      hidden: Array.from(new Set(payload.hidden)).filter((key) => widgetRegistry.some((w) => w.key === key)),
      updatedAt: new Date().toISOString(),
    };

    if (nextLayout.order.length === 0) nextLayout.order = [...defaultLayout.order];

    const before = await prisma.guild.findUnique({ where: { id: guildId }, select: { dashboardLayout: true } });
    await prisma.guild.update({ where: { id: guildId }, data: { dashboardLayout: nextLayout } });

    await saveConfigVersion({
      guildId,
      scope: 'dashboard_layout',
      changedBy: request.user.userId,
      snapshot: nextLayout,
      changeNote: 'Dashboard layout updated',
    });

    await createAuditLog({
      guildId,
      actorId: request.user.userId,
      action: 'dashboard.layout.update',
      targetType: 'dashboard_layout',
      before: before?.dashboardLayout,
      after: nextLayout,
      metadata: { requestId: request.id },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
    });

    return reply.send(ok(nextLayout));
  });

  app.post<{ Params: { guildId: string } }>('/:guildId/dashboard/layout/reset', { preHandler: app.authenticate }, async (request, reply) => {
    const perm = app.requirePermission('config.manage');
    await perm(request, reply);
    if (reply.sent) return;

    const { guildId } = request.params;
    const resetLayout = { ...defaultLayout, updatedAt: new Date().toISOString() };
    await prisma.guild.update({ where: { id: guildId }, data: { dashboardLayout: resetLayout } });

    await createAuditLog({
      guildId,
      actorId: request.user.userId,
      action: 'dashboard.layout.reset',
      targetType: 'dashboard_layout',
      after: resetLayout,
      metadata: { requestId: request.id },
    });

    return reply.send(ok(resetLayout));
  });
};
