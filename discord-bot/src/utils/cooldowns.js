// Simple per-command, per-user cooldown tracker using Discord.js Collections.
import { Collection } from 'discord.js';
import { DEFAULT_COOLDOWN_SECONDS } from '../config/config.js';

/**
 * @param {import('discord.js').Collection} cooldownStore - client.cooldowns
 * @returns {number} seconds remaining, or 0 if the user may proceed (and is now on cooldown).
 */
export function applyCooldown(cooldownStore, command, userId) {
  const cooldownAmount = (command.cooldown ?? DEFAULT_COOLDOWN_SECONDS) * 1000;
  if (cooldownAmount <= 0) return 0;

  if (!cooldownStore.has(command.data.name)) {
    cooldownStore.set(command.data.name, new Collection());
  }
  const timestamps = cooldownStore.get(command.data.name);
  const now = Date.now();
  const expiresAt = timestamps.get(userId);

  if (expiresAt && now < expiresAt) {
    return (expiresAt - now) / 1000;
  }

  timestamps.set(userId, now + cooldownAmount);
  setTimeout(() => timestamps.delete(userId), cooldownAmount);
  return 0;
}
