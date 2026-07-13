// Logs role changes to the configured moderation log channel.
import { EmbedBuilder } from 'discord.js';
import { getLogChannel } from '../utils/guildConfig.js';
import { EMBED_COLORS, FOOTER_TEXT } from '../config/config.js';

export default {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember) {
    const added = newMember.roles.cache.filter((role) => !oldMember.roles.cache.has(role.id));
    const removed = oldMember.roles.cache.filter((role) => !newMember.roles.cache.has(role.id));
    if (added.size === 0 && removed.size === 0) return;

    const logChannel = await getLogChannel(newMember.guild);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.primary)
      .setTitle('Member Roles Updated')
      .setDescription(`${newMember}`)
      .setFooter({ text: FOOTER_TEXT })
      .setTimestamp();

    if (added.size) embed.addFields({ name: 'Roles Added', value: added.map((r) => `${r}`).join(', ') });
    if (removed.size) embed.addFields({ name: 'Roles Removed', value: removed.map((r) => `${r}`).join(', ') });

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  },
};
