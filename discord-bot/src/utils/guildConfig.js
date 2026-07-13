// Per-guild configuration backed by src/data/config.json.
// Shape: { [guildId]: { logChannelId, welcome: {...}, goodbye: {...} } }
import { readJson, writeJson } from './jsonStorage.js';

const FILE = 'config.json';

export function getGuildConfig(guildId) {
  const data = readJson(FILE, {});
  return data[guildId] ?? {};
}

function updateGuildConfig(guildId, patch) {
  const data = readJson(FILE, {});
  data[guildId] = { ...data[guildId], ...patch };
  writeJson(FILE, data);
  return data[guildId];
}

export function setLogChannel(guildId, channelId) {
  return updateGuildConfig(guildId, { logChannelId: channelId });
}

export async function getLogChannel(guild) {
  const config = getGuildConfig(guild.id);
  if (!config.logChannelId) return null;
  return guild.channels.cache.get(config.logChannelId) ?? (await guild.channels.fetch(config.logChannelId).catch(() => null));
}

export function setWelcomeConfig(guildId, { channelId, message, autoRoleId }) {
  return updateGuildConfig(guildId, {
    welcome: { channelId, message, autoRoleId: autoRoleId ?? null },
  });
}

export function setGoodbyeConfig(guildId, { channelId, message }) {
  return updateGuildConfig(guildId, {
    goodbye: { channelId, message },
  });
}
