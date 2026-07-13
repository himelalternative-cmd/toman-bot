import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock this channel, allowing @everyone to send messages again.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  permissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  cooldown: 5,
  async execute(interaction) {
    try {
      await interaction.channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        { SendMessages: null },
        { reason: `Unlocked by ${interaction.user.tag}` },
      );
    } catch (err) {
      logger.error(`Failed to unlock channel: ${err}`);
      return interaction.reply({ embeds: [errorEmbed('Action Failed', 'Could not unlock this channel.')], ephemeral: true });
    }

    await interaction.reply({ embeds: [successEmbed('Channel Unlocked', '🔓 This channel has been unlocked.')] });
  },
};
