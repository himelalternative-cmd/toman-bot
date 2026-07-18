// In-memory spam tracker + per-guild enable/disable config (backed by JSON).
// Each entry tracks the timestamps of recent messages from a user in a guild.
import { readJson, writeJson } from './jsonStorage.js';

const FILE = 'antispam.json';

// In-memory map: `${guildId}:${userId}` → number[] (message timestamps in ms)
const userMessages = new Map();

// ─── Guild config ────────────────────────────────────────────────────────────

export function isAntiSpamEnabled(guildId) {
  const data = readJson(FILE, {});
  return data[guildId]?.enabled ?? false;
}

export function setAntiSpamEnabled(guildId, enabled) {
  const data = readJson(FILE, {});
  data[guildId] = { ...data[guildId], enabled };
  writeJson(FILE, data);
}

// ─── Message tracking ─────────────────────────────────────────────────────────

const WINDOW_MS = 10_000; // longest window we ever care about

/**
 * Record a new message and return the list of tracked messages in the last
 * WINDOW_MS milliseconds.  Old entries are pruned on every call.
 *
 * @param {string} guildId
 * @param {string} userId
 * @param {number} now  — Date.now()
 * @returns {number[]} timestamps within the last WINDOW_MS
 */
export function recordMessage(guildId, userId, now) {
  const key = `${guildId}:${userId}`;
  const timestamps = userMessages.get(key) ?? [];
  timestamps.push(now);

  // prune anything older than the longest window
  const pruned = timestamps.filter((t) => now - t <= WINDOW_MS);
  userMessages.set(key, pruned);
  return pruned;
}

/**
 * Clear tracked messages for a user (call after taking action so the counter
 * resets and the user doesn't get punished again immediately).
 */
export function clearUserMessages(guildId, userId) {
  userMessages.delete(`${guildId}:${userId}`);
}
