// Per-guild list of role IDs that are restricted from pinging higher roles/users.
// Backed by antipping.json in the data directory.
import { readJson, writeJson } from './jsonStorage.js';

const FILE = 'antipping.json';

/** @returns {string[]} array of restricted role IDs for this guild */
export function getRestrictedRoles(guildId) {
  const data = readJson(FILE, {});
  return data[guildId] ?? [];
}

/** Add a role to the restricted list (idempotent). */
export function addRestrictedRole(guildId, roleId) {
  const data = readJson(FILE, {});
  const roles = data[guildId] ?? [];
  if (!roles.includes(roleId)) roles.push(roleId);
  data[guildId] = roles;
  writeJson(FILE, data);
}

/** Remove a role from the restricted list. Returns true if it was present. */
export function removeRestrictedRole(guildId, roleId) {
  const data = readJson(FILE, {});
  const roles = data[guildId] ?? [];
  const idx = roles.indexOf(roleId);
  if (idx === -1) return false;
  roles.splice(idx, 1);
  data[guildId] = roles;
  writeJson(FILE, data);
  return true;
}
