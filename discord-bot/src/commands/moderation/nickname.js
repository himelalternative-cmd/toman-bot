import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { checkUserHierarchy } from '../../utils/permissions.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription("Change a member's nickname.")
    .addUserOption((opt) => opt.setName('target').setDescription('The member to rename').setRequired(true))
    .addStringOption((opt) => opt.setName('nickname').setDescription('New nickname (leave blank to reset)').setRequired(false).setMaxLength(32))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),
  permissions: [PermissionFlagsBits.ManageNicknames],
  botPermissions: [PermissionFlagsBits.ManageNicknames],
  cooldown: 3,
  async execute(interaction) {
    const target = interaction.options.getUser('target', true);
    const nickname = interaction.options.getString('nickname');

    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!targetMember) {
      return interaction.reply({ embeds: [errorEmbed('Not Found', 'That user is not a member of this server.')], ephemeral: true });
    }

    const hierarchyIssue = checkUserHierarchy(interaction, targetMember);
    if (hierarchyIssue) {
      return interaction.reply({ embeds: [errorEmbed('Hierarchy Error', hierarchyIssue)], ephemeral: true });
    }

    try {
      await targetMember.setNickname(nickname, `Changed by ${interaction.user.tag}`);
    } catch (err) {
      logger.error(`Failed to change nickname for ${target.tag}: ${err}`);
      return interaction.reply({
        embeds: [errorEmbed('Action Failed', 'I could not change this member\'s nickname — their role may be higher than mine.')],
        ephemeral: true,
      });
    }

    const message = nickname ? `**${target.tag}**'s nickname has been changed to **${nickname}**.` : `**${target.tag}**'s nickname has been reset.`;
    await interaction.reply({ embeds: [successEmbed('Nickname Updated', message)] });
  },
};
