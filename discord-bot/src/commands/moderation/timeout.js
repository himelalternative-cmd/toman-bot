import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, moderationLogEmbed } from '../../utils/embeds.js';
import { getLogChannel } from '../../utils/guildConfig.js';
import { checkUserHierarchy } from '../../utils/permissions.js';
import { TIMEOUT_DURATIONS } from '../../config/config.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Time out a member, or remove an existing timeout.')
    .addUserOption((opt) => opt.setName('target').setDescription('The member to time out').setRequired(true))
    .addStringOption((opt) =>
      opt
        .setName('duration')
        .setDescription('How long to time out the member for')
        .setRequired(false)
        .addChoices(...Object.keys(TIMEOUT_DURATIONS).map((key) => ({ name: key, value: key }))),
    )
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the timeout').setRequired(false))
    .addBooleanOption((opt) => opt.setName('remove').setDescription('Remove an active timeout instead of applying one').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  permissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  cooldown: 5,
  async execute(interaction) {
    const target = interaction.options.getUser('target', true);
    const durationKey = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const remove = interaction.options.getBoolean('remove') ?? false;

    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) {
      return interaction.reply({ embeds: [errorEmbed('Not Found', 'That user is not a member of this server.')], ephemeral: true });
    }

    const hierarchyIssue = checkUserHierarchy(interaction, targetMember);
    if (hierarchyIssue) {
      return interaction.reply({ embeds: [errorEmbed('Hierarchy Error', hierarchyIssue)], ephemeral: true });
    }
    if (!targetMember.moderatable) {
      return interaction.reply({
        embeds: [errorEmbed('Hierarchy Error', 'I cannot time out this member — their role may be higher than mine.')],
        ephemeral: true,
      });
    }

    if (remove) {
      try {
        await targetMember.timeout(null, `${interaction.user.tag}: ${reason}`);
      } catch (err) {
        logger.error(`Failed to remove timeout for ${target.tag}: ${err}`);
        return interaction.reply({ embeds: [errorEmbed('Action Failed', 'Could not remove the timeout.')], ephemeral: true });
      }

      await interaction.reply({ embeds: [successEmbed('Timeout Removed', `**${target.tag}**'s timeout has been removed.`)] });
      const logChannel = await getLogChannel(interaction.guild);
      if (logChannel) {
        await logChannel.send({ embeds: [moderationLogEmbed('Timeout Removed', interaction.user, target, reason)] }).catch(() => {});
      }
      return;
    }

    if (!durationKey) {
      return interaction.reply({ embeds: [errorEmbed('Missing Duration', 'Provide a `duration` or set `remove: true`.')], ephemeral: true });
    }

    const durationMs = TIMEOUT_DURATIONS[durationKey];

    try {
      await targetMember.timeout(durationMs, `${interaction.user.tag}: ${reason}`);
    } catch (err) {
      logger.error(`Failed to time out ${target.tag}: ${err}`);
      return interaction.reply({ embeds: [errorEmbed('Timeout Failed', 'Something went wrong while trying to time out this member.')], ephemeral: true });
    }

    await interaction.reply({
      embeds: [successEmbed('Member Timed Out', `**${target.tag}** has been timed out for **${durationKey}**.\n**Reason:** ${reason}`)],
    });

    const logChannel = await getLogChannel(interaction.guild);
    if (logChannel) {
      await logChannel
        .send({ embeds: [moderationLogEmbed('Member Timed Out', interaction.user, target, reason, [{ name: 'Duration', value: durationKey, inline: true }])] })
        .catch(() => {});
    }
  },
};
