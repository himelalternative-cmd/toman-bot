// Auto-react configuration, backed by src/data/autoReact.json.
// Shape: { [guildId]: { [channelId]: string[] } } — emojis are stored as raw
// reaction strings (unicode emoji or Discord custom-emoji identifiers).
import { readJson, writeJson } from './jsonStorage.js';

const FILE = 'autoReact.json';

export function getAutoReactChannels(guildId) {
  const data = readJson(FILE, {});
  return data[guildId] ?? {};
}

export function getAutoReactEmojis(guildId, channelId) {
  const channels = getAutoReactChannels(guildId);
  return channels[channelId] ?? null;
}

export function setAutoReact(guildId, channelId, emojis) {
  const data = readJson(FILE, {});
  data[guildId] = { ...data[guildId], [channelId]: emojis };
  writeJson(FILE, data);
}

export function removeAutoReact(guildId, channelId) {
  const data = readJson(FILE, {});
  if (data[guildId]) {
    delete data[guildId][channelId];
    if (Object.keys(data[guildId]).length === 0) delete data[guildId];
  }
  writeJson(FILE, data);
}
