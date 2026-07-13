// Sends the configured welcome message and applies the auto-role, if set.
import { EmbedBuilder } from 'discord.js';
import { getGuildConfig, getLogChannel } from '../utils/guildConfig.js';
import { EMBED_COLORS, FOOTER_TEXT } from '../config/config.js';
import { logger } from '../utils/logger.js';

function fillTemplate(template, member) {
  return template
    .replaceAll('{user}', `${member}`)
    .replaceAll('{username}', member.user.username)
    .replaceAll('{server}', member.guild.name)
    .replaceAll('{memberCount}', `${member.guild.memberCount}`);
}

export default {
  name: 'guildMemberAdd',
  async execute(member) {
    const config = getGuildConfig(member.guild.id);

    if (config.welcome?.channelId) {
      const channel = member.guild.channels.cache.get(config.welcome.channelId);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.success)
          .setTitle(`Welcome to ${member.guild.name}!`)
          .setDescription(fillTemplate(config.welcome.message || 'Welcome {user} to {server}!', member))
          .setThumbnail(member.user.displayAvatarURL())
          .setImage(member.guild.iconURL({ size: 512 }))
          .addFields({ name: 'Member Count', value: `${member.guild.memberCount}`, inline: true })
          .setFooter({ text: FOOTER_TEXT })
          .setTimestamp();
        await channel.send({ embeds: [embed] }).catch((err) => logger.error(`Failed to send welcome message: ${err}`));
      }

      if (config.welcome.autoRoleId) {
        const role = member.guild.roles.cache.get(config.welcome.autoRoleId);
        if (role) await member.roles.add(role).catch((err) => logger.error(`Failed to apply auto-role: ${err}`));
      }
    }

    const logChannel = await getLogChannel(member.guild);
    if (logChannel) {
      await logChannel
        .send({
          embeds: [
            new EmbedBuilder()
              .setColor(EMBED_COLORS.primary)
              .setTitle('Member Joined')
              .setDescription(`${member} (${member.user.tag})`)
              .setThumbnail(member.user.displayAvatarURL())
              .setFooter({ text: FOOTER_TEXT })
              .setTimestamp(),
          ],
        })
        .catch(() => {});
    }
  },
};
