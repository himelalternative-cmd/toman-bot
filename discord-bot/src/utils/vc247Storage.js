// 24/7 voice-channel presence config, backed by src/data/vc247.json.
// Shape: { [guildId]: { channelId, enabled } }
import { readJson, writeJson } from './jsonStorage.js';

const FILE = 'vc247.json';

export function getVc247Config(guildId) {
  const data = readJson(FILE, {});
  return data[guildId] ?? null;
}

export function getAllVc247Configs() {
  return readJson(FILE, {});
}

export function setVc247Config(guildId, config) {
  const data = readJson(FILE, {});
  data[guildId] = { ...data[guildId], ...config };
  writeJson(FILE, data);
  return data[guildId];
}

export function clearVc247Config(guildId) {
  const data = readJson(FILE, {});
  delete data[guildId];
  writeJson(FILE, data);
}
