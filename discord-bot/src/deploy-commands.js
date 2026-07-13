// Standalone script to manually (re)register slash commands.
// The bot also auto-registers on startup (see events/ready.js) — use this
// script when you want to deploy commands without starting the full bot,
// e.g. in a CI/deploy step on Railway.
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { collectCommands } from './handlers/commandHandler.js';
import { logger } from './utils/logger.js';

async function deploy() {
  const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

  if (!DISCORD_TOKEN || !CLIENT_ID) {
    logger.error('DISCORD_TOKEN and CLIENT_ID must be set to deploy commands.');
    process.exit(1);
  }

  const entries = await collectCommands();
  const body = entries.map(({ command }) => command.data.toJSON());
  const rest = new REST().setToken(DISCORD_TOKEN);

  try {
    logger.info(`Deploying ${body.length} slash command(s)...`);
    const route = GUILD_ID ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID) : Routes.applicationCommands(CLIENT_ID);
    await rest.put(route, { body });
    logger.success(
      GUILD_ID
        ? `Registered commands to guild ${GUILD_ID} (instant).`
        : 'Registered global commands (may take up to 1 hour to propagate).',
    );
  } catch (err) {
    logger.error(`Failed to deploy commands: ${err}`);
    process.exit(1);
  }
}

deploy();
