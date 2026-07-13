// Manages voice connections for 24/7 presence: joining, leaving, and
// automatically rejoining after an unexpected disconnect (kick, crash, restart).
import { joinVoiceChannel, getVoiceConnection, entersState, VoiceConnectionStatus } from '@discordjs/voice';
import { getVc247Config, getAllVc247Configs, setVc247Config, clearVc247Config } from '../utils/vc247Storage.js';
import { logger } from '../utils/logger.js';

const RECONNECT_GRACE_MS = 5_000;
const REJOIN_RETRY_MS = 5_000;

let discordClient = null;

export function getConnection(guildId) {
  return getVoiceConnection(guildId);
}

/** Joins (or moves to) a voice channel, wiring up auto-reconnect handling. */
export function joinChannel(channel) {
  const existing = getVoiceConnection(channel.guild.id);
  if (existing && existing.joinConfig.channelId === channel.id) return existing;
  if (existing) existing.destroy();

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: false,
  });

  attachResilience(connection, channel.guild.id);
  return connection;
}

export function leaveChannel(guildId) {
  const connection = getVoiceConnection(guildId);
  if (connection) connection.destroy();
}

function attachResilience(connection, guildId) {
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      // A brief disconnect (e.g. a voice server update) resolves itself — give it a moment.
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, RECONNECT_GRACE_MS),
        entersState(connection, VoiceConnectionStatus.Connecting, RECONNECT_GRACE_MS),
      ]);
    } catch {
      connection.destroy();
      const config = getVc247Config(guildId);
      if (config?.enabled) scheduleRejoin(guildId, config.channelId);
    }
  });

  connection.on('error', (err) => logger.error(`Voice connection error in guild ${guildId}: ${err.message ?? err}`));
}

function scheduleRejoin(guildId, channelId) {
  setTimeout(async () => {
    const config = getVc247Config(guildId);
    if (!config?.enabled || !discordClient) return;

    const guild = discordClient.guilds.cache.get(guildId);
    if (!guild) return;
    const channel = guild.channels.cache.get(channelId) ?? (await guild.channels.fetch(channelId).catch(() => null));
    if (!channel) return;

    try {
      joinChannel(channel);
      logger.success(`24/7 mode: rejoined voice channel in guild ${guildId} after a disconnect.`);
    } catch (err) {
      logger.error(`24/7 mode: rejoin failed in guild ${guildId}, retrying: ${err}`);
      scheduleRejoin(guildId, channelId);
    }
  }, REJOIN_RETRY_MS);
}

/** Called once at startup — rejoins every guild that had 24/7 mode enabled. */
export async function initVc247(client) {
  discordClient = client;
  const configs = getAllVc247Configs();

  for (const [guildId, config] of Object.entries(configs)) {
    if (!config.enabled) continue;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;
    const channel = guild.channels.cache.get(config.channelId) ?? (await guild.channels.fetch(config.channelId).catch(() => null));
    if (!channel) continue;

    try {
      joinChannel(channel);
      logger.success(`24/7 mode: joined voice channel in guild ${guildId}.`);
    } catch (err) {
      logger.error(`24/7 mode: failed to join voice channel in guild ${guildId}: ${err}`);
    }
  }
}

export function enable247(channel) {
  setVc247Config(channel.guild.id, { channelId: channel.id, enabled: true });
  return joinChannel(channel);
}

export function disable247(guildId) {
  clearVc247Config(guildId);
  leaveChannel(guildId);
}
