// Robux order storage backed by rbxOrders.json.
// Shape: { [guildId]: { counter: number, orders: { [orderId]: Order } } }
// Order: { orderId, userId, userTag, robloxUsername, robuxAmount, zpDeducted, channelId, createdAt, status }
import { readJson, writeJson } from './jsonStorage.js';

const FILE = 'rbxOrders.json';

function getGuildData(data, guildId) {
  data[guildId] ??= { counter: 0, orders: {} };
  return data[guildId];
}

export function createOrder(guildId, { userId, userTag, robloxUsername, robuxAmount, zpDeducted, channelId }) {
  const data = readJson(FILE, {});
  const guildData = getGuildData(data, guildId);
  guildData.counter += 1;
  const orderId = String(guildData.counter).padStart(4, '0');

  const order = {
    orderId,
    userId,
    userTag,
    robloxUsername,
    robuxAmount,
    zpDeducted,
    channelId,
    createdAt: Date.now(),
    status: 'pending',
  };

  guildData.orders[orderId] = order;
  writeJson(FILE, data);
  return order;
}

export function getOrder(guildId, orderId) {
  const data = readJson(FILE, {});
  return data[guildId]?.orders?.[orderId] ?? null;
}

export function completeOrder(guildId, orderId) {
  const data = readJson(FILE, {});
  if (!data[guildId]?.orders?.[orderId]) return null;
  data[guildId].orders[orderId].status = 'completed';
  writeJson(FILE, data);
  return data[guildId].orders[orderId];
}
