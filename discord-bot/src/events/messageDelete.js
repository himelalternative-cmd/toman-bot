// Logs deleted messages to the configured moderation log channel.
import { EmbedBuilder } from 'discord.js';
import { getLogChannel } from '../utils/guildConfig.js';
import { EMBED_COLORS, FOOTER_TEXT } from '../config/config.js';

export default {
  name: 'messageDelete',
  async execute(message) {
    if (!message.guild || message.author?.bot) return;

    const logChannel = await getLogChannel(message.guild);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.error)
      .setTitle('Message Deleted')
      .addFields(
        { name: 'Author', value: message.author ? `${message.author.tag}` : 'Unknown', inline: true },
        { name: 'Channel', value: `${message.channel}`, inline: true },
        { name: 'Content', value: message.content?.slice(0, 1024) || '*No text content (embed/attachment)*' },
      )
      .setFooter({ text: FOOTER_TEXT })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  },
};
