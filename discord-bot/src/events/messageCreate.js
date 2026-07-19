// Handles incoming messages: prefix commands, auto-react, anti-spam, anti-ping.
import { getAutoReactEmojis } from '../utils/autoReactStorage.js';
import { isAntiSpamEnabled, recordMessage, clearUserMessages } from '../utils/antiSpamStorage.js';
import { getRestrictedRoles } from '../utils/antiPingStorage.js';
import { getLogChannel } from '../utils/guildConfig.js';
import { moderationLogEmbed } from '../utils/embeds.js';
import { handleRbxAccCommand } from '../handlers/rbxAccHandler.js';
import { logger } from '../utils/logger.js';

// ─── Anti-spam config ─────────────────────────────────────────────────────────
const DELETE_THRESHOLD    = 4;
const DELETE_WINDOW_MS    = 5000;
const TIMEOUT_THRESHOLD   = 10;
const TIMEOUT_WINDOW_MS   = 10000;
const TIMEOUT_DURATION_MS = 3 * 24 * 60 * 60 * 1000;
const SPAM_REASON         = 'Spamming [Bokachoda Khanki magir pola]';

export default {
  name: 'messageCreate',
  async execute(message) {
    if (!message.guild || message.author?.bot) return;

    // ── Prefix commands ─────────────────────────────────────────────────────
    const content = message.content.trim().toLowerCase();
    if (content === '!rbxacc') {
      return handleRbxAccCommand(message);
    }

    // ── Auto-react ──────────────────────────────────────────────────────────
    const emojis = getAutoReactEmojis(message.guild.id, message.channel.id);
    if (emojis && emojis.length > 0) {
      for (const emoji of emojis) {
        try {
          await message.react(emoji);
        } catch (err) {
          logger.warn(`Failed to auto-react with ${emoji} in ${message.channel.id}: ${err}`);
        }
      }
    }

    // ── Anti-ping ───────────────────────────────────────────────────────────
    await handleAntiPing(message);

    // ── Anti-spam ───────────────────────────────────────────────────────────
    if (isAntiSpamEnabled(message.guild.id)) {
      await handleAntiSpam(message);
    }
  },
};

// ─── Anti-ping ───────────────────────────────────────────────────────────────

async function handleAntiPing(message) {
  if (!message.mentions.roles.size && !message.mentions.users.size) return;

  const guildId         = message.guild.id;
  const restrictedRoles = getRestrictedRoles(guildId);
  if (restrictedRoles.length === 0) return;

  const author = await message.guild.members.fetch(message.author.id).catch(() => null);
  if (!author) return;

  const isRestricted = author.roles.cache.some((r) => restrictedRoles.includes(r.id));
  if (!isRestricted) return;

  const authorHighest = author.roles.highest.position;

  const pinggedHigherRole = message.mentions.roles.some((role) => role.position > authorHighest);

  let pinggedHigherUser = false;
  if (message.mentions.users.size > 0) {
    const mentionedMembers = await Promise.all(
      message.mentions.users.map((u) => message.guild.members.fetch(u.id).catch(() => null)),
    );
    pinggedHigherUser = mentionedMembers.some((m) => m && m.roles.highest.position > authorHighest);
  }

  if (!pinggedHigherRole && !pinggedHigherUser) return;

  await message.delete().catch(() => {});

  const notice = await message.channel
    .send(`<@${message.author.id}> Sorry, You cant ping anyone that have higher role than you`)
    .catch(() => null);

  if (notice) setTimeout(() => notice.delete().catch(() => {}), 2000);

  logger.info(`Anti-ping: blocked ${message.author.tag} from pinging a higher role/user in guild ${guildId}`);
}

// ─── Anti-spam ───────────────────────────────────────────────────────────────

async function handleAntiSpam(message) {
  const now     = Date.now();
  const guildId = message.guild.id;
  const userId  = message.author.id;

  const timestamps = recordMessage(guildId, userId, now);
  const inTimeout  = timestamps.filter((t) => now - t <= TIMEOUT_WINDOW_MS).length;
  const inDelete   = timestamps.filter((t) => now - t <= DELETE_WINDOW_MS).length;

  if (inTimeout >= TIMEOUT_THRESHOLD) {
    clearUserMessages(guildId, userId);

    const member = await message.guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    try {
      const fetched  = await message.channel.messages.fetch({ limit: 50 });
      const toDelete = fetched.filter((m) => m.author.id === userId && now - m.createdTimestamp <= TIMEOUT_WINDOW_MS);
      if (toDelete.size > 0) await message.channel.bulkDelete(toDelete, true).catch(() => {});
    } catch (err) {
      logger.warn(`Anti-spam: bulk-delete failed for ${message.author.tag}: ${err}`);
    }

    if (member.moderatable) {
      try {
        await member.timeout(TIMEOUT_DURATION_MS, SPAM_REASON);
        logger.info(`Anti-spam: timed out ${message.author.tag} for 3 days in guild ${guildId}`);
      } catch (err) {
        logger.error(`Anti-spam: timeout failed for ${message.author.tag}: ${err}`);
      }

      const logChannel = await getLogChannel(message.guild);
      if (logChannel) {
        await logChannel.send({
          embeds: [
            moderationLogEmbed('Auto-Spam Timeout', message.client.user, message.author, SPAM_REASON, [
              { name: 'Duration', value: '3 days', inline: true },
              { name: 'Trigger', value: `${inTimeout} messages in 10 seconds`, inline: true },
            ]),
          ],
        }).catch(() => {});
      }
    }
  } else if (inDelete >= DELETE_THRESHOLD) {
    try {
      const fetched  = await message.channel.messages.fetch({ limit: 50 });
      const toDelete = fetched.filter((m) => m.author.id === userId && now - m.createdTimestamp <= DELETE_WINDOW_MS);
      if (toDelete.size > 0) {
        await message.channel.bulkDelete(toDelete, true).catch(() => {});
        logger.info(`Anti-spam: deleted ${toDelete.size} msgs from ${message.author.tag} in guild ${guildId}`);
      }
    } catch (err) {
      logger.warn(`Anti-spam: bulk-delete failed for ${message.author.tag}: ${err}`);
    }
  }
}
