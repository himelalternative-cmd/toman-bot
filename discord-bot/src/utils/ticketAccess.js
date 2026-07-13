// Ticket staff allow-list backed by src/data/ticketAccess.json.
// Shape: { [guildId]: string[] } — array of authorized user IDs.
import { readJson, writeJson } from './jsonStorage.js';

const FILE = 'ticketAccess.json';

export function getTicketAccessList(guildId) {
  const data = readJson(FILE, {});
  return data[guildId] ?? [];
}

export function addTicketAccessUser(guildId, userId) {
  const data = readJson(FILE, {});
  data[guildId] ??= [];
  if (!data[guildId].includes(userId)) data[guildId].push(userId);
  writeJson(FILE, data);
  return data[guildId];
}

export function removeTicketAccessUser(guildId, userId) {
  const data = readJson(FILE, {});
  data[guildId] ??= [];
  data[guildId] = data[guildId].filter((id) => id !== userId);
  writeJson(FILE, data);
  return data[guildId];
}

export function isTicketAccessUser(guildId, userId) {
  return getTicketAccessList(guildId).includes(userId);
}
