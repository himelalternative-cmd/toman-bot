// Sends the configured goodbye message and logs the departure.
import { EmbedBuilder } from 'discord.js';
import { getGuildConfig, getLogChannel } from '../utils/guildConfig.js';
import { EMBED_COLORS, FOOTER_TEXT } from '../config/config.js';
import { logger } from '../utils/logger.js';

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
    if (logChannel) {
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
    }
  },
};
