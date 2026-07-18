// Handles incoming messages: auto-react and anti-spam enforcement.
import { getAutoReactEmojis } from '../utils/autoReactStorage.js';
import { isAntiSpamEnabled, recordMessage, clearUserMessages } from '../utils/antiSpamStorage.js';
import { getLogChannel } from '../utils/guildConfig.js';
import { moderationLogEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

// ─── Anti-spam config ─────────────────────────────────────────────────────────
const DELETE_THRESHOLD   = 4;     // messages in DELETE_WINDOW_MS → delete only
const DELETE_WINDOW_MS   = 5000;  // 5 seconds
const TIMEOUT_THRESHOLD  = 10;   // messages in TIMEOUT_WINDOW_MS → delete + timeout
const TIMEOUT_WINDOW_MS  = 10000; // 10 seconds
const TIMEOUT_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const SPAM_REASON        = 'Spamming [Bokachoda Khanki magir pola]';

export default {
  name: 'messageCreate',
  async execute(message) {
    if (!message.guild || message.author?.bot) return;

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

    // ── Anti-spam ───────────────────────────────────────────────────────────
    if (!isAntiSpamEnabled(message.guild.id)) return;

    const now        = Date.now();
    const guildId    = message.guild.id;
    const userId     = message.author.id;

    // recordMessage returns ALL timestamps within the last 10 s (includes
    // messages already deleted by a previous rule-1 trigger — the tracker is
    // in-memory and doesn't care whether Discord deleted the message).
    const timestamps = recordMessage(guildId, userId, now);

    const inTimeout = timestamps.filter((t) => now - t <= TIMEOUT_WINDOW_MS).length;
    const inDelete  = timestamps.filter((t) => now - t <= DELETE_WINDOW_MS).length;

    if (inTimeout >= TIMEOUT_THRESHOLD) {
      // ── Rule 2: 10+ messages in 10 s (including previously deleted ones) ─
      // → bulk-delete whatever is still visible, then 3-day timeout.
      clearUserMessages(guildId, userId);

      const member = await message.guild.members.fetch(userId).catch(() => null);
      if (!member) return;

      // Delete still-visible messages from the last 10 s
      try {
        const fetched = await message.channel.messages.fetch({ limit: 50 });
        const toDelete = fetched.filter(
          (m) => m.author.id === userId && now - m.createdTimestamp <= TIMEOUT_WINDOW_MS,
        );
        if (toDelete.size > 0) await message.channel.bulkDelete(toDelete, true).catch(() => {});
      } catch (err) {
        logger.warn(`Anti-spam: failed to bulk-delete messages for ${message.author.tag}: ${err}`);
      }

      // Apply 3-day timeout
      if (member.moderatable) {
        try {
          await member.timeout(TIMEOUT_DURATION_MS, SPAM_REASON);
          logger.info(`Anti-spam: timed out ${message.author.tag} (${userId}) in ${guildId} for 3 days`);
        } catch (err) {
          logger.error(`Anti-spam: failed to timeout ${message.author.tag}: ${err}`);
        }

        // Log to mod-log channel
        const logChannel = await getLogChannel(message.guild);
        if (logChannel) {
          await logChannel
            .send({
              embeds: [
                moderationLogEmbed('Auto-Spam Timeout', message.client.user, message.author, SPAM_REASON, [
                  { name: 'Duration', value: '3 days', inline: true },
                  { name: 'Trigger', value: `${inTimeout} messages in 10 seconds`, inline: true },
                ]),
              ],
            })
            .catch(() => {});
        }
      }
    } else if (inDelete >= DELETE_THRESHOLD) {
      // ── Rule 1: 4+ messages in 5 s → delete only (no timeout yet) ────────
      // Timestamps are NOT cleared so they keep counting toward the 10-message threshold.
      try {
        const fetched = await message.channel.messages.fetch({ limit: 50 });
        const toDelete = fetched.filter(
          (m) => m.author.id === userId && now - m.createdTimestamp <= DELETE_WINDOW_MS,
        );
        if (toDelete.size > 0) {
          await message.channel.bulkDelete(toDelete, true).catch(() => {});
          logger.info(`Anti-spam: deleted ${toDelete.size} messages from ${message.author.tag} in ${guildId}`);
        }
      } catch (err) {
        logger.warn(`Anti-spam: failed to bulk-delete messages for ${message.author.tag}: ${err}`);
      }
    }
  },
};
