import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { checkUserHierarchy } from '../../utils/permissions.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server.')
    .addUserOption((opt) => opt.setName('target').setDescription('The member to kick').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the kick').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  permissions: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],
  cooldown: 5,
  async execute(interaction) {
    const target = interaction.options.getUser('target', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('Invalid Target', 'You cannot kick yourself.')], ephemeral: true });
    }
    if (target.id === interaction.client.user.id) {
      return interaction.reply({ embeds: [errorEmbed('Invalid Target', 'I cannot kick myself.')], ephemeral: true });
    }

    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) {
      return interaction.reply({ embeds: [errorEmbed('Not Found', 'That user is not a member of this server.')], ephemeral: true });
    }

    const hierarchyIssue = checkUserHierarchy(interaction, targetMember);
    if (hierarchyIssue) {
      return interaction.reply({ embeds: [errorEmbed('Hierarchy Error', hierarchyIssue)], ephemeral: true });
    }
    if (!targetMember.kickable) {
      return interaction.reply({
        embeds: [errorEmbed('Hierarchy Error', 'I cannot kick this member — their role may be higher than mine.')],
        ephemeral: true,
      });
    }

    await targetMember
      .send({ embeds: [errorEmbed(`You were kicked from ${interaction.guild.name}`, `**Reason:** ${reason}`)] })
      .catch(() => logger.warn(`Could not DM ${target.tag} before kicking.`));

    try {
      await targetMember.kick(`${interaction.user.tag}: ${reason}`);
    } catch (err) {
      logger.error(`Failed to kick ${target.tag}: ${err}`);
      return interaction.reply({ embeds: [errorEmbed('Kick Failed', 'Something went wrong while trying to kick this member.')], ephemeral: true });
    }

    await interaction.reply({ embeds: [successEmbed('Member Kicked', `**${target.tag}** has been kicked.\n**Reason:** ${reason}`)] });
    // The guildMemberRemove event detects the kick via the audit log and logs it there.
  },
};
