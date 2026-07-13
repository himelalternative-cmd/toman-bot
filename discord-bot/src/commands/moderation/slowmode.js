import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set this channel\'s slowmode delay.')
    .addIntegerOption((opt) => opt.setName('seconds').setDescription('Delay in seconds (0 to disable, max 21600)').setRequired(true).setMinValue(0).setMaxValue(21_600))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  permissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  cooldown: 5,
  async execute(interaction) {
    const seconds = interaction.options.getInteger('seconds', true);

    try {
      await interaction.channel.setRateLimitPerUser(seconds, `Set by ${interaction.user.tag}`);
    } catch (err) {
      logger.error(`Failed to set slowmode: ${err}`);
      return interaction.reply({ embeds: [errorEmbed('Action Failed', 'Could not update slowmode for this channel.')], ephemeral: true });
    }

    const message = seconds === 0 ? 'Slowmode has been disabled for this channel.' : `Slowmode set to **${seconds}s** for this channel.`;
    await interaction.reply({ embeds: [successEmbed('Slowmode Updated', message)] });
  },
};
