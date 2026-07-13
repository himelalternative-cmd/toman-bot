import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { setWelcomeConfig } from '../../utils/guildConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setwelcome')
    .setDescription('Configure the welcome message for new members.')
    .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to post welcome messages in').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption((opt) =>
      opt
        .setName('message')
        .setDescription('Welcome message. Placeholders: {user} {username} {server} {memberCount}')
        .setRequired(false),
    )
    .addRoleOption((opt) => opt.setName('autorole').setDescription('Role to automatically assign to new members').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  permissions: [PermissionFlagsBits.Administrator],
  cooldown: 3,
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel', true);
    const message = interaction.options.getString('message') ?? 'Welcome {user} to {server}! You are member #{memberCount}.';
    const autoRole = interaction.options.getRole('autorole');

    setWelcomeConfig(interaction.guild.id, { channelId: channel.id, message, autoRoleId: autoRole?.id });

    const details = autoRole ? `\nAuto-role: ${autoRole}` : '';
    await interaction.reply({ embeds: [successEmbed('Welcome System Configured', `New members will be welcomed in ${channel}.${details}`)] });
  },
};
