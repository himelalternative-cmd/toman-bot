import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, moderationLogEmbed } from '../../utils/embeds.js';
import { getLogChannel } from '../../utils/guildConfig.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by their ID.')
    .addStringOption((opt) => opt.setName('user_id').setDescription('The ID of the user to unban').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the unban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  permissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  cooldown: 5,
  async execute(interaction) {
    const userId = interaction.options.getString('user_id', true).trim();
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!/^\d{17,20}$/.test(userId)) {
      return interaction.reply({ embeds: [errorEmbed('Invalid ID', 'That does not look like a valid Discord user ID.')], ephemeral: true });
    }

    const bans = await interaction.guild.bans.fetch().catch(() => null);
    if (!bans?.has(userId)) {
      return interaction.reply({ embeds: [errorEmbed('Not Banned', 'That user is not currently banned.')], ephemeral: true });
    }

    try {
      await interaction.guild.bans.remove(userId, `${interaction.user.tag}: ${reason}`);
    } catch (err) {
      logger.error(`Failed to unban ${userId}: ${err}`);
      return interaction.reply({ embeds: [errorEmbed('Unban Failed', 'Something went wrong while trying to unban this user.')], ephemeral: true });
    }

    const target = bans.get(userId).user;
    await interaction.reply({ embeds: [successEmbed('User Unbanned', `**${target.tag}** has been unbanned.\n**Reason:** ${reason}`)] });

    const logChannel = await getLogChannel(interaction.guild);
    if (logChannel) {
      await logChannel.send({ embeds: [moderationLogEmbed('User Unbanned', interaction.user, target, reason)] }).catch(() => {});
    }
  },
};
