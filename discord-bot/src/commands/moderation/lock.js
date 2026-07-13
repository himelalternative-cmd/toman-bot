import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock this channel, preventing @everyone from sending messages.')
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for locking the channel').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  permissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  cooldown: 5,
  async execute(interaction) {
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    try {
      await interaction.channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        { SendMessages: false },
        { reason: `${interaction.user.tag}: ${reason}` },
      );
    } catch (err) {
      logger.error(`Failed to lock channel: ${err}`);
      return interaction.reply({ embeds: [errorEmbed('Action Failed', 'Could not lock this channel.')], ephemeral: true });
    }

    await interaction.reply({ embeds: [successEmbed('Channel Locked', `🔒 This channel has been locked.\n**Reason:** ${reason}`)] });
  },
};
