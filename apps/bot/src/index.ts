// =============================================
// Lunaria Bot – Entry Point
// =============================================

import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { client, commands } from './client.js';
import type { Command } from './types.js';

function log(level: 'info' | 'warn' | 'error', event: string, data: Record<string, unknown> = {}): void {
  const payload = { ts: new Date().toISOString(), service: 'bot', level, event, ...data };
  // eslint-disable-next-line no-console
  console[level](JSON.stringify(payload));
}

// ---- Env validation ----
const required = ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID', 'API_BASE_URL', 'DATABASE_URL', 'BOT_INTERNAL_SECRET'] as const;
for (const key of required) {
  if (!process.env[key]) {
    log('error', 'env.missing', { key });
    process.exit(1);
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- Load event handlers ----
async function loadEvents(): Promise<void> {
  const eventsDir = join(__dirname, 'events');
  let files: string[];
  try {
    files = readdirSync(eventsDir).filter((f) => f.endsWith('.js') || f.endsWith('.ts'));
  } catch {
    log('warn', 'events.dir_missing');
    return;
  }

  for (const file of files) {
    const filePath = join(eventsDir, file);
    const module = await import(pathToFileURL(filePath).href) as {
      default?: { name: string; once?: boolean; execute: (...args: unknown[]) => Promise<void> };
      name?: string;
      once?: boolean;
      execute?: (...args: unknown[]) => Promise<void>;
    };

    const event = module.default ?? module;
    if (!event.name || !event.execute) {
      log('warn', 'events.invalid_export', { file });
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => void event.execute!(...args));
    } else {
      client.on(event.name, (...args) => void event.execute!(...args));
    }

    log('info', 'events.loaded', { event: event.name });
  }
}

// ---- Load commands ----
async function loadCommands(): Promise<void> {
  const commandsDir = join(__dirname, 'commands');
  let files: string[];
  try {
    files = readdirSync(commandsDir).filter((f) => f.endsWith('.js') || f.endsWith('.ts'));
  } catch {
    log('warn', 'commands.dir_missing');
    return;
  }

  for (const file of files) {
    const filePath = join(commandsDir, file);
    const module = await import(pathToFileURL(filePath).href) as { default?: Command } & Partial<Command>;
    const command: Command | undefined = module.default ?? (module.data && module.execute ? (module as Command) : undefined);

    if (!command?.data || !command?.execute) {
      log('warn', 'commands.invalid_export', { file });
      continue;
    }

    commands.set(command.data.name, command);
    log('info', 'commands.loaded', { command: command.data.name });
  }
}

// ---- Bootstrap ----
async function main(): Promise<void> {
  const correlationId = crypto.randomUUID();
  log('info', 'startup.begin', { correlationId });
  await loadEvents();
  await loadCommands();

  const token = process.env['DISCORD_BOT_TOKEN']!;
  await client.login(token);
  log('info', 'startup.ready', { correlationId });
}

main().catch((err) => {
  log('error', 'startup.fatal', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
