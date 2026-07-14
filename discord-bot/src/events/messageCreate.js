// Auto-reacts to messages posted in channels configured via /autoreact.
import { getAutoReactEmojis } from '../utils/autoReactStorage.js';
import { logger } from '../utils/logger.js';

export default {
  name: 'messageCreate',
  async execute(message) {
    if (!message.guild || message.author?.bot) return;

    const emojis = getAutoReactEmojis(message.guild.id, message.channel.id);
    if (!emojis || emojis.length === 0) return;

    for (const emoji of emojis) {
      try {
        await message.react(emoji);
      } catch (err) {
        logger.warn(`Failed to auto-react with ${emoji} in ${message.channel.id}: ${err}`);
      }
    }
  },
};
