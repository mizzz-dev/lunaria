// eslint-disable-next-line @typescript-eslint/no-require-imports
const IoRedis = require('ioredis');

const url = process.env['REDIS_URL'];
if (!url) throw new Error('REDIS_URL is required');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const connection: any = new IoRedis(url, { maxRetriesPerRequest: null });
connection.on('error', (err: unknown) => console.error('[worker] Redis error:', err));
