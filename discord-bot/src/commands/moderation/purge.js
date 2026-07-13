import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk-delete recent messages from this channel.')
    .addIntegerOption((opt) => opt.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  permissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages],
  cooldown: 5,
  async execute(interaction) {
    const amount = interaction.options.getInteger('amount', true);

    await interaction.deferReply({ ephemeral: true });

    try {
      const deleted = await interaction.channel.bulkDelete(amount, true);
      await interaction.editReply({ embeds: [successEmbed('Messages Purged', `Deleted **${deleted.size}** message(s). (Messages older than 14 days can't be bulk-deleted.)`)] });
    } catch (err) {
      logger.error(`Failed to purge messages: ${err}`);
      await interaction.editReply({ embeds: [errorEmbed('Purge Failed', 'Something went wrong while deleting messages.')] });
    }
  },
};
