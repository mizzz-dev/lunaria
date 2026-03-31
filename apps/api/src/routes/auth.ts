import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@lunaria/db';
import { ok, err } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';
import { getDiscordOAuthUrl, exchangeCodeForTokens, getDiscordUser, getDiscordGuilds } from '../lib/discord.js';
import { hasManageGuildPermission } from '@lunaria/shared';
import { randomBytes } from 'node:crypto';

export const authRoutes: FastifyPluginAsync = async (app) => {
  // GET /auth/login
  app.get('/login', async (_request, reply) => {
    const state = randomBytes(16).toString('hex');
    reply.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 300 });
    return reply.redirect(getDiscordOAuthUrl(state));
  });

  // GET /auth/callback
  app.get<{ Querystring: { code?: string; state?: string } }>('/callback', async (request, reply) => {
    const { code, state } = request.query;
    const savedState = (request.cookies as Record<string, string | undefined>)['oauth_state'];

    if (!code) return reply.redirect(`${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/login?error=no_code`);
    if (state && savedState && state !== savedState) {
      return reply.redirect(`${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/login?error=state_mismatch`);
    }

    const tokens = await exchangeCodeForTokens(code);
    const discordUser = await getDiscordUser(tokens.access_token);

    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const user = await prisma.user.upsert({
      where: { discordId: discordUser.id },
      create: {
        discordId: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator ?? '0',
        globalName: discordUser.global_name,
        avatar: discordUser.avatar,
        email: discordUser.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt,
      },
      update: {
        username: discordUser.username,
        discriminator: discordUser.discriminator ?? '0',
        globalName: discordUser.global_name,
        avatar: discordUser.avatar,
        email: discordUser.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt,
      },
    });

    const token = app.jwt.sign({ userId: user.id, discordId: user.discordId });
    reply.setCookie('lunaria_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env['NODE_ENV'] === 'production',
    });
    reply.clearCookie('oauth_state');

    return reply.redirect(`${process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'}/dashboard`);
  });

  // GET /auth/me
  app.get('/me', { preHandler: app.authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: { id: true, discordId: true, username: true, globalName: true, avatar: true, email: true },
    });
    if (!user) return reply.status(401).send(err(ErrorCodes.UNAUTHORIZED, 'User not found'));
    return reply.send(ok(user));
  });

  // GET /auth/guilds - guilds where user can manage (has MANAGE_GUILD or ADMINISTRATOR)
  app.get('/guilds', { preHandler: app.authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: { accessToken: true },
    });
    if (!user?.accessToken) return reply.status(401).send(err(ErrorCodes.UNAUTHORIZED, 'No access token'));

    const discordGuilds = await getDiscordGuilds(user.accessToken);
    const manageable = discordGuilds.filter((g) => hasManageGuildPermission(g.permissions));

    // Enrich with DB guild data where available
    const dbGuilds = await prisma.guild.findMany({
      where: { discordId: { in: manageable.map((g) => g.id) } },
      select: { discordId: true, active: true, botJoinedAt: true },
    });
    const dbMap = new Map(dbGuilds.map((g) => [g.discordId, g]));

    const result = manageable.map((g) => ({
      ...g,
      botPresent: dbMap.has(g.id),
      botJoinedAt: dbMap.get(g.id)?.botJoinedAt ?? null,
    }));

    return reply.send(ok(result));
  });

  // POST /auth/logout
  app.post('/logout', async (_request, reply) => {
    reply.clearCookie('lunaria_token', { path: '/' });
    return reply.send(ok({ message: 'Logged out' }));
  });
};
