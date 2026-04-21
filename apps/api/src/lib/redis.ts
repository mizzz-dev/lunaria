import { Redis } from 'ioredis';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

type RedisClient = Redis;

let _redis: RedisClient | null = null;

function createRedis(): RedisClient {
  const client = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  });

  client.on('error', (err: unknown) => {
    console.error('[redis] Connection error:', err);
  });

  client.on('connect', () => {
    console.info('[redis] Connected');
  });

  return client;
}

export const redis: RedisClient = (() => {
  if (!_redis) {
    _redis = createRedis();
  }
  return _redis;
})();
