import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { addTicketAccessUser, removeTicketAccessUser } from '../../utils/ticketAccess.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticketaccess')
    .setDescription('Manage who can claim, close, and manage support tickets.')
    .addSubcommand((sub) =>
      sub.setName('add').setDescription('Grant a user ticket staff access').addUserOption((opt) => opt.setName('user').setDescription('The user to add').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription("Revoke a user's ticket staff access")
        .addUserOption((opt) => opt.setName('user').setDescription('The user to remove').setRequired(true)),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  permissions: [PermissionFlagsBits.Administrator],
  cooldown: 3,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user', true);

    if (sub === 'add') {
      addTicketAccessUser(interaction.guild.id, user.id);
      return interaction.reply({
        embeds: [successEmbed('Ticket Access Granted', `${user} can now claim, mark done, delete, and generate transcripts for tickets.`)],
      });
    }

    removeTicketAccessUser(interaction.guild.id, user.id);
    await interaction.reply({ embeds: [successEmbed('Ticket Access Revoked', `${user} no longer has ticket staff access.`)] });
  },
};
