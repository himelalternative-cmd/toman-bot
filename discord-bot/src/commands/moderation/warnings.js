import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { infoEmbed, errorEmbed } from '../../utils/embeds.js';
import { getWarnings } from '../../utils/warnings.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription("View a member's warnings.")
    .addUserOption((opt) => opt.setName('target').setDescription('The member to check').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  permissions: [PermissionFlagsBits.ModerateMembers],
  cooldown: 3,
  async execute(interaction) {
    const target = interaction.options.getUser('target', true);
    const warnings = getWarnings(interaction.guild.id, target.id);

    if (warnings.length === 0) {
      return interaction.reply({ embeds: [errorEmbed('No Warnings', `**${target.tag}** has no warnings.`)], ephemeral: true });
    }

    const description = warnings
      .map((w, i) => `**#${i + 1}** \`${w.id}\`\n> ${w.reason}\n> Moderator: <@${w.moderatorId}> • <t:${Math.floor(w.timestamp / 1000)}:R>`)
      .join('\n\n');

    await interaction.reply({ embeds: [infoEmbed(`Warnings for ${target.tag} (${warnings.length})`, description)], ephemeral: true });
  },
};
