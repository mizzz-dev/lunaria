import type { FastifyReply, FastifyRequest } from 'fastify';
import { err } from '@lunaria/shared';
import { ErrorCodes } from '@lunaria/types';
import { redis } from './redis.js';

interface RateLimitOptions {
  keyPrefix: string;
  max: number;
  windowSec: number;
}

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function parseIp(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? request.ip;
  }
  return request.ip;
}

async function consumeRedis(key: string, windowSec: number): Promise<{ count: number; ttl: number }> {
  const multi = redis.multi();
  multi.incr(key);
  multi.ttl(key);
  const [[, count], [, ttl]] = (await multi.exec()) as [[null, number], [null, number]];
  if (count === 1 || ttl < 0) {
    await redis.expire(key, windowSec);
    return { count, ttl: windowSec };
  }
  return { count, ttl: Math.max(ttl, 0) };
}

function consumeMemory(key: string, windowSec: number): { count: number; ttl: number } {
  const now = Date.now();
  const current = memoryStore.get(key);
  if (!current || current.resetAt <= now) {
    const resetAt = now + windowSec * 1000;
    memoryStore.set(key, { count: 1, resetAt });
    return { count: 1, ttl: windowSec };
  }

  current.count += 1;
  return { count: current.count, ttl: Math.ceil((current.resetAt - now) / 1000) };
}

export async function applyRateLimit(
  request: FastifyRequest,
  reply: FastifyReply,
  options: RateLimitOptions,
): Promise<void> {
  const identifier = `${request.method}:${parseIp(request)}`;
  const key = `${options.keyPrefix}:${identifier}`;

  let count = 0;
  let ttl = options.windowSec;
  let backend = 'redis';

  try {
    if (redis.status !== 'ready' && redis.status !== 'connecting') {
      await redis.connect();
    }
    const redisResult = await consumeRedis(key, options.windowSec);
    count = redisResult.count;
    ttl = redisResult.ttl;
  } catch {
    const memoryResult = consumeMemory(key, options.windowSec);
    count = memoryResult.count;
    ttl = memoryResult.ttl;
    backend = 'memory';
  }

  reply.header('X-RateLimit-Limit', options.max);
  reply.header('X-RateLimit-Remaining', Math.max(options.max - count, 0));
  reply.header('X-RateLimit-Reset', ttl);
  reply.header('X-RateLimit-Backend', backend);

  if (count > options.max) {
    reply.header('Retry-After', ttl);
    await reply.status(429).send(
      err(ErrorCodes.RATE_LIMITED, 'Too many requests', {
        retryAfterSec: ttl,
        limit: options.max,
        windowSec: options.windowSec,
      }),
    );
  }
}
