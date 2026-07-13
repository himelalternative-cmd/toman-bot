// Fires once when the bot logs in — auto-registers slash commands.
import { logger } from '../utils/logger.js';
import { registerSlashCommands } from '../handlers/commandHandler.js';

export default {
  name: 'clientReady',
  once: true,
  async execute(client) {
    logger.success(`Logged in as ${client.user.tag} — serving ${client.guilds.cache.size} guild(s).`);
    client.user.setActivity('/help | moderation bot');
    await registerSlashCommands(client);
  },
};
