// ZP (currency) balance storage backed by zp.json.
// Shape: { [guildId]: { [userId]: number } }
import { readJson, writeJson } from './jsonStorage.js';

const FILE = 'zp.json';

export function getBalance(guildId, userId) {
  const data = readJson(FILE, {});
  return data[guildId]?.[userId] ?? 0;
}

export function setBalance(guildId, userId, amount) {
  const data = readJson(FILE, {});
  data[guildId] ??= {};
  data[guildId][userId] = Math.max(0, amount);
  writeJson(FILE, data);
  return data[guildId][userId];
}

export function addBalance(guildId, userId, amount) {
  const current = getBalance(guildId, userId);
  return setBalance(guildId, userId, current + amount);
}

/**
 * Deduct `amount` from the user's balance.
 * Returns { success: true, newBalance } or { success: false, currentBalance }.
 */
export function deductBalance(guildId, userId, amount) {
  const current = getBalance(guildId, userId);
  if (current < amount) return { success: false, currentBalance: current };
  const newBalance = setBalance(guildId, userId, current - amount);
  return { success: true, newBalance };
}
