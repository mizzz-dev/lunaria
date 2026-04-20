import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('bot entrypoint has required env preflight checks', () => {
  assert.equal(existsSync(new URL('../src/index.ts', import.meta.url)), true);
  const src = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
  assert.match(src, /DISCORD_BOT_TOKEN/);
  assert.match(src, /BOT_INTERNAL_SECRET/);
});
