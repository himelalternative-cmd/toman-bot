import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, moderationLogEmbed } from '../../utils/embeds.js';
import { getLogChannel } from '../../utils/guildConfig.js';
import { addWarning, getWarnings } from '../../utils/warnings.js';
import { checkUserHierarchy } from '../../utils/permissions.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member.')
    .addUserOption((opt) => opt.setName('target').setDescription('The member to warn').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the warning').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  permissions: [PermissionFlagsBits.ModerateMembers],
  cooldown: 3,
  async execute(interaction) {
    const target = interaction.options.getUser('target', true);
    const reason = interaction.options.getString('reason', true);

    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('Invalid Target', 'You cannot warn yourself.')], ephemeral: true });
    }
    if (target.bot) {
      return interaction.reply({ embeds: [errorEmbed('Invalid Target', 'You cannot warn a bot.')], ephemeral: true });
    }

    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (targetMember) {
      const hierarchyIssue = checkUserHierarchy(interaction, targetMember);
      if (hierarchyIssue) {
        return interaction.reply({ embeds: [errorEmbed('Hierarchy Error', hierarchyIssue)], ephemeral: true });
      }
    }

    addWarning(interaction.guild.id, target.id, interaction.user.id, reason);
    const total = getWarnings(interaction.guild.id, target.id).length;

    await targetMember
      ?.send({ embeds: [errorEmbed(`You were warned in ${interaction.guild.name}`, `**Reason:** ${reason}\n**Total warnings:** ${total}`)] })
      .catch(() => logger.warn(`Could not DM ${target.tag} about their warning.`));

    await interaction.reply({
      embeds: [successEmbed('Member Warned', `**${target.tag}** has been warned.\n**Reason:** ${reason}\n**Total warnings:** ${total}`)],
    });

    const logChannel = await getLogChannel(interaction.guild);
    if (logChannel) {
      await logChannel
        .send({ embeds: [moderationLogEmbed('Member Warned', interaction.user, target, reason, [{ name: 'Total Warnings', value: `${total}`, inline: true }])] })
        .catch(() => {});
    }
  },
};
