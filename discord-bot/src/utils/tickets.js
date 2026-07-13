// Ticket storage backed by src/data/tickets.json.
// Shape: { [guildId]: { counter: number, tickets: { [ticketId]: Ticket } } }
// Ticket: { id, userId, channelId, type, createdAt, claimed, claimedBy, status: 'open'|'done', doneAt }
import { readJson, writeJson } from './jsonStorage.js';

const FILE = 'tickets.json';

function getGuildData(data, guildId) {
  data[guildId] ??= { counter: 0, tickets: {} };
  return data[guildId];
}

/** Creates a new ticket with a sequential, zero-padded ID (e.g. "001") unique per guild. */
export function createTicket(guildId, { userId, channelId, type = null }) {
  const data = readJson(FILE, {});
  const guildData = getGuildData(data, guildId);
  guildData.counter += 1;
  const id = String(guildData.counter).padStart(3, '0');

  const ticket = {
    id,
    userId,
    channelId,
    type,
    createdAt: Date.now(),
    claimed: false,
    claimedBy: null,
    status: 'open',
    doneAt: null,
  };
  guildData.tickets[id] = ticket;
  writeJson(FILE, data);
  return ticket;
}

export function getTicket(guildId, ticketId) {
  const data = readJson(FILE, {});
  return data[guildId]?.tickets?.[ticketId] ?? null;
}

export function getTicketByChannel(guildId, channelId) {
  const data = readJson(FILE, {});
  const tickets = data[guildId]?.tickets ?? {};
  return Object.values(tickets).find((t) => t.channelId === channelId) ?? null;
}

/** A user counts as having an "open" ticket as long as any record for them still exists. */
export function getOpenTicketForUser(guildId, userId) {
  const data = readJson(FILE, {});
  const tickets = data[guildId]?.tickets ?? {};
  return Object.values(tickets).find((t) => t.userId === userId) ?? null;
}

export function updateTicket(guildId, ticketId, patch) {
  const data = readJson(FILE, {});
  const guildData = getGuildData(data, guildId);
  if (!guildData.tickets[ticketId]) return null;
  guildData.tickets[ticketId] = { ...guildData.tickets[ticketId], ...patch };
  writeJson(FILE, data);
  return guildData.tickets[ticketId];
}

export function removeTicket(guildId, ticketId) {
  const data = readJson(FILE, {});
  if (!data[guildId]?.tickets?.[ticketId]) return false;
  delete data[guildId].tickets[ticketId];
  writeJson(FILE, data);
  return true;
}

export function getAllTickets(guildId) {
  const data = readJson(FILE, {});
  return Object.values(data[guildId]?.tickets ?? {});
}

/** Finds every "done" ticket across all guilds that has been sitting past the deadline. */
export function getDoneTicketsPastDeadline(deadlineMs) {
  const data = readJson(FILE, {});
  const results = [];

  for (const [guildId, guildData] of Object.entries(data)) {
    for (const ticket of Object.values(guildData.tickets ?? {})) {
      if (ticket.status === 'done' && ticket.doneAt && Date.now() - ticket.doneAt >= deadlineMs) {
        results.push({ guildId, ticket });
      }
    }
  }

  return results;
}
