// Sends the configured goodbye message and logs the departure.
// Distinguishes a plain leave from a kick or ban using the audit log, so the
// log channel never shows "Member Left" for someone who was removed by staff.
import { AuditLogEvent, EmbedBuilder } from 'discord.js';
import { getGuildConfig, getLogChannel } from '../utils/guildConfig.js';
import { EMBED_COLORS, FOOTER_TEXT } from '../config/config.js';
import { logger } from '../utils/logger.js';

// How recent an audit log entry must be to be considered the cause of this removal.
const AUDIT_LOG_WINDOW_MS = 10_000;

/**
 * Checks the audit log for a ban or kick entry targeting this member that
 * happened just now. Returns { type: 'ban' | 'kick', moderatorTag, reason } or null.
 */
async function resolveRemovalCause(member) {
  try {
    const [banLogs, kickLogs] = await Promise.all([
      member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 5 }),
      member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 5 }),
    ]);

    const banEntry = banLogs.entries.find((e) => e.target?.id === member.id && Date.now() - e.createdTimestamp < AUDIT_LOG_WINDOW_MS);
    if (banEntry) return { type: 'ban' };

    const kickEntry = kickLogs.entries.find((e) => e.target?.id === member.id && Date.now() - e.createdTimestamp < AUDIT_LOG_WINDOW_MS);
    if (kickEntry) {
      return { type: 'kick', moderatorTag: kickEntry.executor?.tag ?? 'Unknown', reason: kickEntry.reason ?? 'No reason provided' };
    }
  } catch (err) {
    logger.warn(`Could not fetch audit log for ${member.user.tag}'s removal: ${err}`);
  }
  return null;
}

function fillTemplate(template, member) {
  return template
    .replaceAll('{user}', member.user.tag)
    .replaceAll('{username}', member.user.username)
    .replaceAll('{server}', member.guild.name)
    .replaceAll('{memberCount}', `${member.guild.memberCount}`);
}

export default {
  name: 'guildMemberRemove',
  async execute(member) {
    const config = getGuildConfig(member.guild.id);

    if (config.goodbye?.channelId) {
      const channel = member.guild.channels.cache.get(config.goodbye.channelId);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.warning)
          .setTitle('Goodbye!')
          .setDescription(fillTemplate(config.goodbye.message || '{username} has left {server}.', member))
          .setThumbnail(member.user.displayAvatarURL())
          .addFields({ name: 'Member Count', value: `${member.guild.memberCount}`, inline: true })
          .setFooter({ text: FOOTER_TEXT })
          .setTimestamp();
        await channel.send({ embeds: [embed] }).catch((err) => logger.error(`Failed to send goodbye message: ${err}`));
      }
    }

    const logChannel = await getLogChannel(member.guild);
    if (!logChannel) return;

    const cause = await resolveRemovalCause(member);

    // Bans are logged by the dedicated guildBanAdd handler — skip here to avoid duplicates.
    if (cause?.type === 'ban') return;

    if (cause?.type === 'kick') {
      await logChannel
        .send({
          embeds: [
            new EmbedBuilder()
              .setColor(EMBED_COLORS.error)
              .setTitle('Member Kicked')
              .addFields(
                { name: 'Target', value: `${member.user.tag} (${member.id})`, inline: true },
                { name: 'Moderator', value: cause.moderatorTag, inline: true },
                { name: 'Reason', value: cause.reason },
              )
              .setThumbnail(member.user.displayAvatarURL())
              .setFooter({ text: FOOTER_TEXT })
              .setTimestamp(),
          ],
        })
        .catch(() => {});
      return;
    }

    await logChannel
      .send({
        embeds: [
          new EmbedBuilder()
            .setColor(EMBED_COLORS.warning)
            .setTitle('Member Left')
            .setDescription(`${member.user.tag}`)
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter({ text: FOOTER_TEXT })
            .setTimestamp(),
        ],
      })
      .catch(() => {});
  },
};
