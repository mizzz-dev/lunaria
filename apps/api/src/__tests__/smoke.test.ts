import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../app.js';

test('api app bootstraps and health endpoint responds', async () => {
  const app = await buildApp();
  const res = await app.inject({ method: 'GET', url: '/healthz' });
  assert.equal(res.statusCode, 200);
  const body = res.json() as { ok: boolean };
  assert.equal(body.ok, true);
  await app.close();
});
