import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { checkUserHierarchy } from '../../utils/permissions.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server.')
    .addUserOption((opt) => opt.setName('target').setDescription('The member to ban').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  permissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  cooldown: 5,
  async execute(interaction) {
    const target = interaction.options.getUser('target', true);
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('Invalid Target', 'You cannot ban yourself.')], ephemeral: true });
    }
    if (target.id === interaction.client.user.id) {
      return interaction.reply({ embeds: [errorEmbed('Invalid Target', 'I cannot ban myself.')], ephemeral: true });
    }

    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (targetMember) {
      const hierarchyIssue = checkUserHierarchy(interaction, targetMember);
      if (hierarchyIssue) {
        return interaction.reply({ embeds: [errorEmbed('Hierarchy Error', hierarchyIssue)], ephemeral: true });
      }
      if (!targetMember.bannable) {
        return interaction.reply({
          embeds: [errorEmbed('Hierarchy Error', 'I cannot ban this member — their role may be higher than mine.')],
          ephemeral: true,
        });
      }

      // Best-effort DM before the ban takes effect.
      await targetMember
        .send({ embeds: [errorEmbed(`You were banned from ${interaction.guild.name}`, `**Reason:** ${reason}`)] })
        .catch(() => logger.warn(`Could not DM ${target.tag} before banning.`));
    }

    try {
      await interaction.guild.members.ban(target.id, { reason: `${interaction.user.tag}: ${reason}` });
    } catch (err) {
      logger.error(`Failed to ban ${target.tag}: ${err}`);
      return interaction.reply({ embeds: [errorEmbed('Ban Failed', 'Something went wrong while trying to ban this member.')], ephemeral: true });
    }

    await interaction.reply({ embeds: [successEmbed('Member Banned', `**${target.tag}** has been banned.\n**Reason:** ${reason}`)] });
    // The guildBanAdd event handles the moderation log for every ban (bot-issued or manual).
  },
};
