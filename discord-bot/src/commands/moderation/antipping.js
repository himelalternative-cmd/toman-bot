import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds.js';
import { getRestrictedRoles, addRestrictedRole, removeRestrictedRole } from '../../utils/antiPingStorage.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('anti-ping')
    .setDescription('Prevent selected roles from pinging members or roles ranked above them.')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Restrict a role from pinging anyone higher than them.')
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('The role to restrict').setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove the ping restriction from a role.')
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('The role to un-restrict').setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('Show all roles currently restricted from pinging higher roles.'),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 5,

  async execute(interaction) {
    const sub     = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'list') {
      const roleIds = getRestrictedRoles(guildId);
      if (roleIds.length === 0) {
        return interaction.reply({
          embeds: [infoEmbed('🔕 Anti-Ping', 'No roles are currently restricted from pinging higher roles.')],
          ephemeral: true,
        });
      }
      const lines = roleIds.map((id) => `<@&${id}>`).join('\n');
      return interaction.reply({
        embeds: [infoEmbed('🔕 Anti-Ping — Restricted Roles', lines)],
        ephemeral: true,
      });
    }

    const role = interaction.options.getRole('role', true);

    if (sub === 'add') {
      const roleIds = getRestrictedRoles(guildId);
      if (roleIds.includes(role.id)) {
        return interaction.reply({
          embeds: [errorEmbed('Already Restricted', `${role} is already restricted from pinging higher roles.`)],
          ephemeral: true,
        });
      }
      addRestrictedRole(guildId, role.id);
      logger.info(`Anti-ping: added restriction for role ${role.name} (${role.id}) in guild ${guildId}`);
      return interaction.reply({
        embeds: [
          successEmbed(
            'Restriction Added',
            `${role} can no longer ping roles or members ranked above them.\nThey will receive a silent 2-second notice if they try.`,
          ),
        ],
      });
    }

    if (sub === 'remove') {
      const removed = removeRestrictedRole(guildId, role.id);
      if (!removed) {
        return interaction.reply({
          embeds: [errorEmbed('Not Found', `${role} is not in the restricted list.`)],
          ephemeral: true,
        });
      }
      logger.info(`Anti-ping: removed restriction for role ${role.name} (${role.id}) in guild ${guildId}`);
      return interaction.reply({
        embeds: [successEmbed('Restriction Removed', `${role} can now ping freely again.`)],
      });
    }
  },
};
