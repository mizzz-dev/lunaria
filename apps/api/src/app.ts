import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import crypto from 'node:crypto';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { hasPermission } from '@lunaria/db';
import type { JwtPayload } from '@lunaria/types';
import { ErrorCodes } from '@lunaria/types';
import { err } from '@lunaria/shared';

import { authRoutes } from './routes/auth.js';
import { guildRoutes } from './routes/guilds/index.js';
import { pluginRoutes } from './routes/guilds/plugins.js';
import { ruleRoutes } from './routes/guilds/rules.js';
import { quoteRoutes } from './routes/guilds/quotes.js';
import { pollRoutes } from './routes/guilds/polls.js';
import { eventRoutes } from './routes/guilds/events.js';
import { lfgRoutes } from './routes/guilds/lfg.js';
import { teamSplitRoutes } from './routes/guilds/team-splits.js';
import { faqRoutes } from './routes/guilds/faqs.js';
import { reminderRoutes } from './routes/guilds/reminders.js';
import { moderationRoutes } from './routes/guilds/moderation.js';
import { autoResponseRoutes } from './routes/guilds/auto-responses.js';
import { dailyContentRoutes } from './routes/guilds/daily-content.js';
import { auditLogRoutes } from './routes/guilds/audit-logs.js';
import { configVersionRoutes } from './routes/guilds/config-versions.js';
import { analyticsRoutes } from './routes/guilds/analytics.js';
import { membershipRoutes } from './routes/guilds/memberships.js';
import { roleRoutes } from './routes/guilds/roles.js';
import { templateRoutes } from './routes/templates.js';
import { dashboardLayoutRoutes } from './routes/guilds/dashboard-layout.js';
import { applyRateLimit } from './lib/rate-limit.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePermission: (
      permission: string,
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user: JwtPayload;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
    },
    requestIdHeader: 'x-request-id',
    genReqId: () => crypto.randomUUID(),
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.get('/healthz', async () => ({ ok: true }));

  app.addHook('onRequest', async (request, reply) => {
    if (request.url.startsWith('/api/docs')) return;
    const max = parseInt(process.env['RATE_LIMIT_MAX'] ?? '120', 10);
    const windowSec = parseInt(process.env['RATE_LIMIT_WINDOW_SEC'] ?? '60', 10);
    await applyRateLimit(request, reply, {
      keyPrefix: process.env['RATE_LIMIT_KEY_PREFIX'] ?? 'rl:api',
      max,
      windowSec,
    });
  });

  // CORS
  await app.register(fastifyCors, {
    origin: process.env['API_CORS_ORIGIN'] ?? 'http://localhost:3000',
    credentials: true,
  });

  // Cookie
  await app.register(fastifyCookie, {
    secret: process.env['COOKIE_SECRET'] ?? 'lunaria-cookie-secret',
  });

  // JWT
  await app.register(fastifyJwt, {
    secret: process.env['JWT_SECRET'] ?? 'lunaria-jwt-secret',
    cookie: {
      cookieName: 'lunaria_token',
      signed: false,
    },
  });

  // Swagger
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Lunaria API',
        description: 'Discord community management platform API',
        version: '1.0.0',
      },
      servers: [{ url: '/api/v1' }],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'lunaria_token',
          },
        },
      },
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // Authenticate decorator
  app.decorate(
    'authenticate',
    async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      try {
        await request.jwtVerify({ onlyCookie: true });
      } catch {
        await reply
          .status(401)
          .send(err(ErrorCodes.UNAUTHORIZED, 'Authentication required'));
      }
    },
  );

  // requirePermission decorator factory
  app.decorate(
    'requirePermission',
    function requirePermission(
      permission: string,
    ): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
      return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const guildId = (request.params as Record<string, string | undefined>)['guildId'];
        if (!guildId) {
          await reply.status(400).send(err('BAD_REQUEST', 'Missing guildId'));
          return;
        }
        const userId = request.user.userId;
        const allowed = await hasPermission(userId, guildId, permission);
        if (!allowed) {
          await reply.status(403).send(err(ErrorCodes.FORBIDDEN, 'Insufficient permissions'));
        }
      };
    },
  );

  // Routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(guildRoutes, { prefix: '/api/v1/guilds' });
  await app.register(pluginRoutes, { prefix: '/api/v1/guilds' });
  await app.register(ruleRoutes, { prefix: '/api/v1/guilds' });
  await app.register(quoteRoutes, { prefix: '/api/v1/guilds' });
  await app.register(pollRoutes, { prefix: '/api/v1/guilds' });
  await app.register(eventRoutes, { prefix: '/api/v1/guilds' });
  await app.register(lfgRoutes, { prefix: '/api/v1/guilds' });
  await app.register(teamSplitRoutes, { prefix: '/api/v1/guilds' });
  await app.register(faqRoutes, { prefix: '/api/v1/guilds' });
  await app.register(reminderRoutes, { prefix: '/api/v1/guilds' });
  await app.register(moderationRoutes, { prefix: '/api/v1/guilds' });
  await app.register(autoResponseRoutes, { prefix: '/api/v1/guilds' });
  await app.register(dailyContentRoutes, { prefix: '/api/v1/guilds' });
  await app.register(auditLogRoutes, { prefix: '/api/v1/guilds' });
  await app.register(configVersionRoutes, { prefix: '/api/v1/guilds' });
  await app.register(analyticsRoutes, { prefix: '/api/v1/guilds' });
  await app.register(membershipRoutes, { prefix: '/api/v1/guilds' });
  await app.register(roleRoutes, { prefix: '/api/v1/guilds' });
  await app.register(dashboardLayoutRoutes, { prefix: '/api/v1/guilds' });
  await app.register(templateRoutes, { prefix: '/api/v1' });

  // Global error handler
  app.setErrorHandler(async (error, _request, reply) => {
    app.log.error(error);

    if (error.validation) {
      return reply.status(400).send(
        err(ErrorCodes.VALIDATION_ERROR, 'Validation failed', error.validation),
      );
    }

    if (error.statusCode === 401) {
      return reply.status(401).send(err(ErrorCodes.UNAUTHORIZED, error.message));
    }

    if (error.statusCode === 404) {
      return reply.status(404).send(err(ErrorCodes.NOT_FOUND, error.message));
    }

    return reply.status(500).send(err(ErrorCodes.INTERNAL_ERROR, 'Internal server error'));
  });

  return app;
}
