import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@lunaria/db';
import { ok, err } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';
import { z } from 'zod';

const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  guildId: z.string().optional(),
  eventTypes: z.array(z.string()).default([]),
});

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  // GET /notifications — list user's notifications (paginated)
  app.get<{ Querystring: { read?: string; page?: string; pageSize?: string } }>(
    '/notifications',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { read, page = '1', pageSize = '30' } = request.query;
      const skip = (Number(page) - 1) * Number(pageSize);

      const where = {
        userId: request.user.userId,
        ...(read !== undefined ? { read: read === 'true' } : {}),
      };

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(pageSize),
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { userId: request.user.userId, read: false } }),
      ]);

      return reply.send(ok({ notifications, total, unreadCount, page: Number(page), pageSize: Number(pageSize) }));
    },
  );

  // POST /notifications/read-all — mark all as read
  app.post(
    '/notifications/read-all',
    { preHandler: app.authenticate },
    async (request, reply) => {
      await prisma.notification.updateMany({
        where: { userId: request.user.userId, read: false },
        data: { read: true },
      });
      return reply.send(ok({ updated: true }));
    },
  );

  // PATCH /notifications/:notificationId/read
  app.patch<{ Params: { notificationId: string } }>(
    '/notifications/:notificationId/read',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const notification = await prisma.notification.findFirst({
        where: { id: request.params.notificationId, userId: request.user.userId },
      });
      if (!notification) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Notification not found'));

      const updated = await prisma.notification.update({
        where: { id: request.params.notificationId },
        data: { read: true },
      });

      return reply.send(ok(updated));
    },
  );

  // POST /notifications/subscriptions — register web push subscription
  app.post<{ Body: unknown }>(
    '/notifications/subscriptions',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const body = SubscribeSchema.parse(request.body);

      const subscription = await prisma.notificationSubscription.upsert({
        where: { userId_endpoint: { userId: request.user.userId, endpoint: body.endpoint } },
        create: { userId: request.user.userId, ...body },
        update: { p256dh: body.p256dh, auth: body.auth, eventTypes: body.eventTypes, active: true },
      });

      return reply.status(201).send(ok(subscription));
    },
  );

  // DELETE /notifications/subscriptions/:endpoint — unsubscribe
  app.delete<{ Params: { endpoint: string } }>(
    '/notifications/subscriptions/:endpoint',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const endpoint = decodeURIComponent(request.params.endpoint);
      const sub = await prisma.notificationSubscription.findFirst({
        where: { userId: request.user.userId, endpoint },
      });
      if (!sub) return reply.status(404).send(err(ErrorCodes.NOT_FOUND, 'Subscription not found'));

      await prisma.notificationSubscription.update({
        where: { id: sub.id },
        data: { active: false },
      });

      return reply.send(ok({ unsubscribed: true }));
    },
  );
};
