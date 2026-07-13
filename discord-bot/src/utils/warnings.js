// Warning storage backed by src/data/warnings.json.
// Shape: { [guildId]: { [userId]: Array<{ id, moderatorId, reason, timestamp }> } }
import { readJson, writeJson } from './jsonStorage.js';

const FILE = 'warnings.json';

export function getWarnings(guildId, userId) {
  const data = readJson(FILE, {});
  return data[guildId]?.[userId] ?? [];
}

export function addWarning(guildId, userId, moderatorId, reason) {
  const data = readJson(FILE, {});
  data[guildId] ??= {};
  data[guildId][userId] ??= [];

  const warning = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    moderatorId,
    reason,
    timestamp: Date.now(),
  };
  data[guildId][userId].push(warning);
  writeJson(FILE, data);
  return warning;
}

export function removeWarning(guildId, userId, warningId) {
  const data = readJson(FILE, {});
  const list = data[guildId]?.[userId];
  if (!list) return false;

  const initialLength = list.length;
  data[guildId][userId] = list.filter((w) => w.id !== warningId);
  writeJson(FILE, data);
  return data[guildId][userId].length < initialLength;
}

export function clearWarnings(guildId, userId) {
  const data = readJson(FILE, {});
  if (!data[guildId]?.[userId]) return 0;

  const count = data[guildId][userId].length;
  data[guildId][userId] = [];
  writeJson(FILE, data);
  return count;
}
