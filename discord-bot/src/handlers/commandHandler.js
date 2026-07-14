// Recursively loads every command file under src/commands/<category>/*.js
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Collection } from 'discord.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMMANDS_PATH = path.join(__dirname, '..', 'commands');

/** Returns an array of { category, command } for every valid command file. */
export async function collectCommands() {
  const categories = readdirSync(COMMANDS_PATH, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  const results = [];

  for (const category of categories) {
    const categoryPath = path.join(COMMANDS_PATH, category.name);
    const files = readdirSync(categoryPath).filter((file) => file.endsWith('.js'));

    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      const imported = await import(pathToFileURL(filePath).href);
      const command = imported.default;

      if (!command?.data || typeof command.execute !== 'function') {
        logger.warn(`Skipping invalid command file: ${category.name}/${file}`);
        continue;
      }

      results.push({ category: category.name, command });
    }
  }

  return results;
}

/** Populates client.commands with a Collection<name, command>. */
export async function loadCommands(client) {
  client.commands = new Collection();
  const entries = await collectCommands();

  for (const { category, command } of entries) {
    command.category = category;
    client.commands.set(command.data.name, command);
  }

  logger.success(`Loaded ${client.commands.size} slash commands.`);
}

/** Registers all commands with Discord — globally, or to a single guild if GUILD_ID is set. */
export async function registerSlashCommands(client) {
  const entries = await collectCommands();
  const body = entries.map(({ command }) => command.data.toJSON());
  const guildId = process.env.GUILD_ID || undefined;

  try {
    await client.application.commands.set(body, guildId);
    logger.success(
      guildId
        ? `Registered ${body.length} commands to guild ${guildId} (instant).`
        : `Registered ${body.length} global commands (may take up to 1 hour to propagate).`,
    );

    // Registering to a single guild while global commands still exist makes every
    // command show up twice in that guild. Wipe the global set whenever GUILD_ID is used.
    if (guildId) {
      await client.application.commands.set([]);
      logger.info('Cleared global commands to avoid duplicates while GUILD_ID is set.');
    }
  } catch (err) {
    logger.error(`Failed to auto-register slash commands: ${err}`);
  }
}
