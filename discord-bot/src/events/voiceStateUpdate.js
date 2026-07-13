// Logs voice channel join/leave/switch/mute-deafen activity to the configured log channel.
import { EmbedBuilder } from 'discord.js';
import { getLogChannel } from '../utils/guildConfig.js';
import { EMBED_COLORS, FOOTER_TEXT } from '../config/config.js';

function baseVoiceEmbed(color, title, member) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setThumbnail(member.displayAvatarURL())
    .setFooter({ text: FOOTER_TEXT })
    .setTimestamp();
}

export default {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    const guild = newState.guild ?? oldState.guild;
    if (!guild) return;

    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    const logChannel = await getLogChannel(guild);
    if (!logChannel) return;

    // Channel join (was in no channel, now in one).
    if (!oldState.channelId && newState.channelId) {
      const embed = baseVoiceEmbed(EMBED_COLORS.success, 'Joined Voice Channel', member).addFields(
        { name: 'Member', value: `${member} (${member.user.tag})`, inline: true },
        { name: 'Channel', value: `${newState.channel}`, inline: true },
      );
      await logChannel.send({ embeds: [embed] }).catch(() => {});
      return;
    }

    // Channel leave (was in a channel, now in none).
    if (oldState.channelId && !newState.channelId) {
      const embed = baseVoiceEmbed(EMBED_COLORS.error, 'Left Voice Channel', member).addFields(
        { name: 'Member', value: `${member} (${member.user.tag})`, inline: true },
        { name: 'Channel', value: `${oldState.channel}`, inline: true },
      );
      await logChannel.send({ embeds: [embed] }).catch(() => {});
      return;
    }

    // Switched channel.
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      const embed = baseVoiceEmbed(EMBED_COLORS.warning, 'Switched Voice Channel', member).addFields(
        { name: 'Member', value: `${member} (${member.user.tag})`, inline: true },
        { name: 'From', value: `${oldState.channel}`, inline: true },
        { name: 'To', value: `${newState.channel}`, inline: true },
      );
      await logChannel.send({ embeds: [embed] }).catch(() => {});
    }
  },
};
