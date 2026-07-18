import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds.js';
import { getRestrictedRoles, addRestrictedRole, removeRestrictedRole } from '../../utils/antiPingStorage.js';
import { logger } from '../../utils/logger.js';

// Build role options helper — role1 is required, role2-role5 optional
function addRoleOptions(sub, label) {
  sub.addRoleOption((opt) =>
    opt.setName('role1').setDescription(`${label} (1)`).setRequired(true),
  );
  for (let i = 2; i <= 5; i++) {
    sub.addRoleOption((opt) =>
      opt.setName(`role${i}`).setDescription(`${label} (${i})`).setRequired(false),
    );
  }
  return sub;
}

export default {
  data: new SlashCommandBuilder()
    .setName('anti-ping')
    .setDescription('Prevent selected roles from pinging members or roles ranked above them.')
    .addSubcommand((sub) =>
      addRoleOptions(
        sub
          .setName('add')
          .setDescription('Restrict up to 5 roles from pinging anyone higher than them.'),
        'Role to restrict',
      ),
    )
    .addSubcommand((sub) =>
      addRoleOptions(
        sub
          .setName('remove')
          .setDescription('Remove the ping restriction from up to 5 roles.'),
        'Role to un-restrict',
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

    // Collect all provided role options (role1–role5), filter nulls
    const roles = [1, 2, 3, 4, 5]
      .map((n) => interaction.options.getRole(`role${n}`))
      .filter(Boolean);

    if (sub === 'add') {
      const existing = getRestrictedRoles(guildId);
      const added   = [];
      const skipped = [];

      for (const role of roles) {
        if (existing.includes(role.id)) {
          skipped.push(role.toString());
        } else {
          addRestrictedRole(guildId, role.id);
          added.push(role.toString());
          logger.info(`Anti-ping: restricted role ${role.name} (${role.id}) in guild ${guildId}`);
        }
      }

      const lines = [];
      if (added.length)   lines.push(`**Restricted:** ${added.join(', ')}`);
      if (skipped.length) lines.push(`**Already restricted:** ${skipped.join(', ')}`);

      return interaction.reply({
        embeds: [
          successEmbed(
            'Anti-Ping Updated',
            lines.join('\n') +
              '\n\nThese roles can no longer ping anyone ranked above them.\n' +
              'They will get a silent 2-second notice if they try.',
          ),
        ],
      });
    }

    if (sub === 'remove') {
      const removed  = [];
      const notFound = [];

      for (const role of roles) {
        const ok = removeRestrictedRole(guildId, role.id);
        if (ok) {
          removed.push(role.toString());
          logger.info(`Anti-ping: un-restricted role ${role.name} (${role.id}) in guild ${guildId}`);
        } else {
          notFound.push(role.toString());
        }
      }

      const lines = [];
      if (removed.length)  lines.push(`**Removed:** ${removed.join(', ')}`);
      if (notFound.length) lines.push(`**Not in list:** ${notFound.join(', ')}`);

      return interaction.reply({
        embeds: [successEmbed('Anti-Ping Updated', lines.join('\n'))],
      });
    }
  },
};
