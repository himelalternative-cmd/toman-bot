import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, moderationLogEmbed } from '../../utils/embeds.js';
import { getLogChannel } from '../../utils/guildConfig.js';
import { clearWarnings } from '../../utils/warnings.js';

export default {
  data: new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription("Clear all of a member's warnings.")
    .addUserOption((opt) => opt.setName('target').setDescription('The member to clear warnings for').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  permissions: [PermissionFlagsBits.ModerateMembers],
  cooldown: 3,
  async execute(interaction) {
    const target = interaction.options.getUser('target', true);
    const count = clearWarnings(interaction.guild.id, target.id);

    if (count === 0) {
      return interaction.reply({ embeds: [errorEmbed('No Warnings', `**${target.tag}** has no warnings to clear.`)], ephemeral: true });
    }

    await interaction.reply({ embeds: [successEmbed('Warnings Cleared', `Cleared **${count}** warning(s) for **${target.tag}**.`)] });

    const logChannel = await getLogChannel(interaction.guild);
    if (logChannel) {
      await logChannel
        .send({ embeds: [moderationLogEmbed('Warnings Cleared', interaction.user, target, `${count} warning(s) removed`)] })
        .catch(() => {});
    }
  },
};
