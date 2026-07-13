// Logs edited messages to the configured moderation log channel.
import { EmbedBuilder } from 'discord.js';
import { getLogChannel } from '../utils/guildConfig.js';
import { EMBED_COLORS, FOOTER_TEXT } from '../config/config.js';

export default {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return; // ignore embed-only updates

    const logChannel = await getLogChannel(newMessage.guild);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.warning)
      .setTitle('Message Edited')
      .addFields(
        { name: 'Author', value: `${newMessage.author.tag}`, inline: true },
        { name: 'Channel', value: `${newMessage.channel}`, inline: true },
        { name: 'Before', value: oldMessage.content?.slice(0, 1024) || '*Unknown*' },
        { name: 'After', value: newMessage.content?.slice(0, 1024) || '*Unknown*' },
      )
      .setURL(newMessage.url)
      .setFooter({ text: FOOTER_TEXT })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  },
};
