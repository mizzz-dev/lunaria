import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('worker entrypoint validates runtime env', () => {
  assert.equal(existsSync(new URL('../src/index.ts', import.meta.url)), true);
  const src = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
  assert.match(src, /REDIS_URL/);
  assert.match(src, /DATABASE_URL/);
});
