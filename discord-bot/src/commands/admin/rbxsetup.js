import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds.js';
import { setOrderChannel, getRbxAllowedRoles, setRbxAllowedRoles } from '../../utils/guildConfig.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rbxsetup')
    .setDescription('Configure the Robux shop system.')
    .addSubcommand((sub) =>
      sub
        .setName('orderchannel')
        .setDescription('Set the channel where completed orders are posted.')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('The order channel').setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('addrole')
        .setDescription('Allow a role to use !rbxacc (up to 5 at once).')
        .addRoleOption((opt) => opt.setName('role1').setDescription('Role (1)').setRequired(true))
        .addRoleOption((opt) => opt.setName('role2').setDescription('Role (2)').setRequired(false))
        .addRoleOption((opt) => opt.setName('role3').setDescription('Role (3)').setRequired(false))
        .addRoleOption((opt) => opt.setName('role4').setDescription('Role (4)').setRequired(false))
        .addRoleOption((opt) => opt.setName('role5').setDescription('Role (5)').setRequired(false)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('removerole')
        .setDescription('Remove a role from the !rbxacc allow-list (up to 5 at once).')
        .addRoleOption((opt) => opt.setName('role1').setDescription('Role (1)').setRequired(true))
        .addRoleOption((opt) => opt.setName('role2').setDescription('Role (2)').setRequired(false))
        .addRoleOption((opt) => opt.setName('role3').setDescription('Role (3)').setRequired(false))
        .addRoleOption((opt) => opt.setName('role4').setDescription('Role (4)').setRequired(false))
        .addRoleOption((opt) => opt.setName('role5').setDescription('Role (5)').setRequired(false)),
    )
    .addSubcommand((sub) =>
      sub.setName('listroles').setDescription('Show all roles allowed to use !rbxacc.'),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  permissions: [PermissionFlagsBits.Administrator],
  cooldown: 5,

  async execute(interaction) {
    const sub     = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'orderchannel') {
      const channel = interaction.options.getChannel('channel', true);
      setOrderChannel(guildId, channel.id);
      logger.info(`Rbx order channel set to #${channel.name} in guild ${guildId}`);
      return interaction.reply({
        embeds: [successEmbed('Order Channel Set', `Completed Robux orders will now be posted in ${channel}.`)],
      });
    }

    if (sub === 'listroles') {
      const roleIds = getRbxAllowedRoles(guildId);
      if (roleIds.length === 0) {
        return interaction.reply({
          embeds: [infoEmbed('Rbx Allowed Roles', 'No extra roles configured. Only Admins and ticket staff can use `!rbxacc`.')],
          ephemeral: true,
        });
      }
      return interaction.reply({
        embeds: [infoEmbed('Rbx Allowed Roles', roleIds.map((id) => `<@&${id}>`).join('\n'))],
        ephemeral: true,
      });
    }

    // addrole / removerole — collect up to 5 roles
    const roles = [1, 2, 3, 4, 5]
      .map((n) => interaction.options.getRole(`role${n}`))
      .filter(Boolean);

    if (sub === 'addrole') {
      const current = getRbxAllowedRoles(guildId);
      const added   = [];
      const skipped = [];
      for (const role of roles) {
        if (current.includes(role.id)) { skipped.push(role.toString()); continue; }
        current.push(role.id);
        added.push(role.toString());
      }
      setRbxAllowedRoles(guildId, current);
      const lines = [];
      if (added.length)   lines.push(`**Added:** ${added.join(', ')}`);
      if (skipped.length) lines.push(`**Already allowed:** ${skipped.join(', ')}`);
      logger.info(`Rbx allowed roles updated in guild ${guildId}: added ${added.join(', ')}`);
      return interaction.reply({ embeds: [successEmbed('Roles Updated', lines.join('\n'))] });
    }

    if (sub === 'removerole') {
      const current  = getRbxAllowedRoles(guildId);
      const removed  = [];
      const notFound = [];
      for (const role of roles) {
        const idx = current.indexOf(role.id);
        if (idx === -1) { notFound.push(role.toString()); continue; }
        current.splice(idx, 1);
        removed.push(role.toString());
      }
      setRbxAllowedRoles(guildId, current);
      const lines = [];
      if (removed.length)  lines.push(`**Removed:** ${removed.join(', ')}`);
      if (notFound.length) lines.push(`**Not in list:** ${notFound.join(', ')}`);
      return interaction.reply({ embeds: [successEmbed('Roles Updated', lines.join('\n'))] });
    }
  },
};
