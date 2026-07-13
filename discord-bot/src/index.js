// Entry point — logs in, loads commands/events, and starts the bot.
import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { logger } from './utils/logger.js';

if (!process.env.DISCORD_TOKEN) {
  logger.error('Missing DISCORD_TOKEN in your environment. Add it to .env (see .env.example) before starting the bot.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

client.cooldowns = new Collection();

async function main() {
  await loadCommands(client);
  await loadEvents(client);
  await client.login(process.env.DISCORD_TOKEN);
}

main().catch((err) => {
  logger.error(`Fatal startup error: ${err.stack || err}`);
  process.exit(1);
});

process.on('unhandledRejection', (err) => logger.error(`Unhandled promise rejection: ${err}`));
process.on('uncaughtException', (err) => logger.error(`Uncaught exception: ${err.stack || err}`));
