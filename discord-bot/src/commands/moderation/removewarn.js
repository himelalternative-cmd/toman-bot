import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, moderationLogEmbed } from '../../utils/embeds.js';
import { getLogChannel } from '../../utils/guildConfig.js';
import { removeWarning } from '../../utils/warnings.js';

export default {
  data: new SlashCommandBuilder()
    .setName('removewarn')
    .setDescription('Remove a specific warning from a member.')
    .addUserOption((opt) => opt.setName('target').setDescription('The member to update').setRequired(true))
    .addStringOption((opt) => opt.setName('warning_id').setDescription('The warning ID (from /warnings)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  permissions: [PermissionFlagsBits.ModerateMembers],
  cooldown: 3,
  async execute(interaction) {
    const target = interaction.options.getUser('target', true);
    const warningId = interaction.options.getString('warning_id', true).trim();

    const removed = removeWarning(interaction.guild.id, target.id, warningId);
    if (!removed) {
      return interaction.reply({ embeds: [errorEmbed('Not Found', 'No warning with that ID was found for this member.')], ephemeral: true });
    }

    await interaction.reply({ embeds: [successEmbed('Warning Removed', `Removed warning \`${warningId}\` from **${target.tag}**.`)] });

    const logChannel = await getLogChannel(interaction.guild);
    if (logChannel) {
      await logChannel.send({ embeds: [moderationLogEmbed('Warning Removed', interaction.user, target, `Warning ID: ${warningId}`)] }).catch(() => {});
    }
  },
};
