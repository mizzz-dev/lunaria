// =============================================
// Lunaria Bot – Entry Point
// =============================================

import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { client, commands } from './client.js';
import type { Command } from './types.js';

// ---- Env validation ----
const required = ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID', 'API_BASE_URL', 'DATABASE_URL', 'BOT_INTERNAL_SECRET'] as const;
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[bot] Missing required environment variable: ${key}`);
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
    console.warn('[bot] No events directory found, skipping event loading.');
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
      console.warn(`[bot] Event file ${file} is missing name or execute export, skipping.`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => void event.execute!(...args));
    } else {
      client.on(event.name, (...args) => void event.execute!(...args));
    }

    console.log(`[bot] Loaded event: ${event.name}`);
  }
}

// ---- Load commands ----
async function loadCommands(): Promise<void> {
  const commandsDir = join(__dirname, 'commands');
  let files: string[];
  try {
    files = readdirSync(commandsDir).filter((f) => f.endsWith('.js') || f.endsWith('.ts'));
  } catch {
    console.warn('[bot] No commands directory found, skipping command loading.');
    return;
  }

  for (const file of files) {
    const filePath = join(commandsDir, file);
    const module = await import(pathToFileURL(filePath).href) as { default?: Command } & Partial<Command>;
    const command: Command | undefined = module.default ?? (module.data && module.execute ? (module as Command) : undefined);

    if (!command?.data || !command?.execute) {
      console.warn(`[bot] Command file ${file} is missing data or execute export, skipping.`);
      continue;
    }

    commands.set(command.data.name, command);
    console.log(`[bot] Loaded command: ${command.data.name}`);
  }
}

// ---- Bootstrap ----
async function main(): Promise<void> {
  await loadEvents();
  await loadCommands();

  const token = process.env['DISCORD_BOT_TOKEN']!;
  await client.login(token);
}

main().catch((err) => {
  console.error('[bot] Fatal startup error:', err);
  process.exit(1);
});
