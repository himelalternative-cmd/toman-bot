// Logs bans to the configured log channel — fires for every ban, whether issued
// via /ban or done manually through Discord's own UI. This is the single source
// of truth for ban logging so guildMemberRemove never has to guess.
import { AuditLogEvent, EmbedBuilder } from 'discord.js';
import { getLogChannel } from '../utils/guildConfig.js';
import { EMBED_COLORS, FOOTER_TEXT } from '../config/config.js';
import { logger } from '../utils/logger.js';

export default {
  name: 'guildBanAdd',
  async execute(ban) {
    const { guild, user } = ban;
    const logChannel = await getLogChannel(guild);
    if (!logChannel) return;

    let moderatorTag = 'Unknown';
    let reason = ban.reason ?? 'No reason provided';

    try {
      const audit = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 5 });
      const entry = audit.entries.find((e) => e.target?.id === user.id && Date.now() - e.createdTimestamp < 10_000);
      if (entry) {
        moderatorTag = entry.executor?.tag ?? moderatorTag;
        reason = entry.reason ?? reason;
      }
    } catch (err) {
      logger.warn(`Could not fetch audit log for ban of ${user.tag}: ${err}`);
    }

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.error)
      .setTitle('Member Banned')
      .addFields(
        { name: 'Target', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Moderator', value: moderatorTag, inline: true },
        { name: 'Reason', value: reason },
      )
      .setThumbnail(user.displayAvatarURL())
      .setFooter({ text: FOOTER_TEXT })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  },
};
