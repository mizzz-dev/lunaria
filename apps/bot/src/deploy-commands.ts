// =============================================
// Lunaria Bot – Deploy Slash Commands
// =============================================

import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REST, Routes } from 'discord.js';
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord-api-types/v10';
import type { Command } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const token = process.env['DISCORD_BOT_TOKEN'];
const clientId = process.env['DISCORD_CLIENT_ID'];
const devGuildId = process.env['DISCORD_DEV_GUILD_ID'];

if (!token || !clientId) {
  console.error('[deploy] DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID are required.');
  process.exit(1);
}

async function loadCommandData(): Promise<RESTPostAPIChatInputApplicationCommandsJSONBody[]> {
  const commandsDir = join(__dirname, 'commands');
  const files = readdirSync(commandsDir).filter((f) => f.endsWith('.js') || f.endsWith('.ts'));
  const commandData: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

  for (const file of files) {
    const filePath = join(commandsDir, file);
    const module = await import(pathToFileURL(filePath).href) as { default?: Command } & Partial<Command>;
    const command: Command | undefined = module.default ?? (module.data && module.execute ? (module as Command) : undefined);

    if (!command?.data) {
      console.warn(`[deploy] Skipping ${file}: no data export.`);
      continue;
    }

    commandData.push(command.data.toJSON() as RESTPostAPIChatInputApplicationCommandsJSONBody);
    console.log(`[deploy] Queued command: ${command.data.name}`);
  }

  return commandData;
}

async function deploy(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(token!);
  const commandData = await loadCommandData();

  if (devGuildId) {
    console.log(`[deploy] Registering ${commandData.length} commands to guild ${devGuildId} (instant)...`);
    await rest.put(Routes.applicationGuildCommands(clientId!, devGuildId), { body: commandData });
    console.log('[deploy] Guild commands registered successfully.');
  } else {
    console.log(`[deploy] Registering ${commandData.length} commands globally (may take up to 1 hour)...`);
    await rest.put(Routes.applicationCommands(clientId!), { body: commandData });
    console.log('[deploy] Global commands registered successfully.');
  }
}

deploy().catch((err) => {
  console.error('[deploy] Failed to deploy commands:', err);
  process.exit(1);
});
