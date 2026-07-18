// Handles incoming messages: auto-react and anti-spam enforcement.
import { getAutoReactEmojis } from '../utils/autoReactStorage.js';
import { isAntiSpamEnabled, recordMessage, clearUserMessages } from '../utils/antiSpamStorage.js';
import { getLogChannel } from '../utils/guildConfig.js';
import { warningEmbed, moderationLogEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

// ─── Anti-spam config ─────────────────────────────────────────────────────────
const DELETE_THRESHOLD   = 4;   // messages
const DELETE_WINDOW_MS   = 5000; // 5 seconds  → delete only
const TIMEOUT_THRESHOLD  = 10;  // messages
const TIMEOUT_WINDOW_MS  = 10000; // 10 seconds → delete + 3-day timeout
const TIMEOUT_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days in ms
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
    const timestamps = recordMessage(guildId, userId, now);

    // Count messages inside each window
    const inTimeout = timestamps.filter((t) => now - t <= TIMEOUT_WINDOW_MS).length;
    const inDelete  = timestamps.filter((t) => now - t <= DELETE_WINDOW_MS).length;

    if (inTimeout >= TIMEOUT_THRESHOLD) {
      // ── Rule 2: 10+ in 10 s → delete all + 3-day timeout ────────────────
      clearUserMessages(guildId, userId);

      const member = await message.guild.members.fetch(userId).catch(() => null);
      if (!member) return;

      // Delete recent messages in the channel (fetch last 50, keep only this user's)
      try {
        const fetched = await message.channel.messages.fetch({ limit: 50 });
        const toDelete = fetched.filter(
          (m) => m.author.id === userId && now - m.createdTimestamp <= TIMEOUT_WINDOW_MS,
        );
        await message.channel.bulkDelete(toDelete, true).catch(() => {});
      } catch (err) {
        logger.warn(`Anti-spam: failed to bulk-delete messages for ${message.author.tag}: ${err}`);
      }

      // Apply timeout if the bot has permission and the member is moderatable
      if (member.moderatable) {
        try {
          await member.timeout(TIMEOUT_DURATION_MS, SPAM_REASON);
          logger.info(`Anti-spam: timed out ${message.author.tag} (${userId}) in ${guildId} for 3 days`);
        } catch (err) {
          logger.error(`Anti-spam: failed to timeout ${message.author.tag}: ${err}`);
        }

        // DM the user
        await message.author
          .send({
            embeds: [
              warningEmbed(
                '⏳ You Have Been Timed Out',
                `You have been timed out in **${message.guild.name}** for **3 days**.\n**Reason:** ${SPAM_REASON}`,
              ),
            ],
          })
          .catch(() => {}); // user may have DMs disabled

        // Log to mod log channel
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
      // ── Rule 1: 4+ in 5 s → delete all (no timeout yet) ─────────────────
      try {
        const fetched = await message.channel.messages.fetch({ limit: 50 });
        const toDelete = fetched.filter(
          (m) => m.author.id === userId && now - m.createdTimestamp <= DELETE_WINDOW_MS,
        );
        await message.channel.bulkDelete(toDelete, true).catch(() => {});
        logger.info(`Anti-spam: deleted ${toDelete.size} messages from ${message.author.tag} in ${guildId}`);
      } catch (err) {
        logger.warn(`Anti-spam: failed to bulk-delete messages for ${message.author.tag}: ${err}`);
      }

      // Warn the user via DM (once — they may receive several if they keep spamming)
      await message.author
        .send({
          embeds: [
            warningEmbed(
              '⚠️ Slow Down!',
              `Your messages in **${message.guild.name}** were deleted because you sent them too fast.\nContinued spamming will result in a **3-day timeout**.`,
            ),
          ],
        })
        .catch(() => {});
    }
  },
};
