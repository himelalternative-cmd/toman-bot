// Per-guild configuration backed by src/data/config.json.
// Shape: { [guildId]: { logChannelId, orderChannelId, rbxAllowedRoles, welcome: {...}, goodbye: {...} } }
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

export function setTranscriptChannel(guildId, channelId) {
  return updateGuildConfig(guildId, { transcriptChannelId: channelId });
}

export async function getTranscriptChannel(guild) {
  const config = getGuildConfig(guild.id);
  if (!config.transcriptChannelId) return null;
  return guild.channels.cache.get(config.transcriptChannelId) ?? (await guild.channels.fetch(config.transcriptChannelId).catch(() => null));
}

// ─── Robux shop ───────────────────────────────────────────────────────────────

export function setOrderChannel(guildId, channelId) {
  return updateGuildConfig(guildId, { orderChannelId: channelId });
}

export async function getOrderChannel(guild) {
  const config = getGuildConfig(guild.id);
  if (!config.orderChannelId) return null;
  return guild.channels.cache.get(config.orderChannelId) ?? (await guild.channels.fetch(config.orderChannelId).catch(() => null));
}

/** @returns {string[]} role IDs allowed to use !rbxacc beyond admins/ticket-staff */
export function getRbxAllowedRoles(guildId) {
  const config = getGuildConfig(guildId);
  return config.rbxAllowedRoles ?? [];
}

export function setRbxAllowedRoles(guildId, roleIds) {
  return updateGuildConfig(guildId, { rbxAllowedRoles: roleIds });
}
