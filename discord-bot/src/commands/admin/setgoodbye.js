import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { setGoodbyeConfig } from '../../utils/guildConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setgoodbye')
    .setDescription('Configure the goodbye message for departing members.')
    .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to post goodbye messages in').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addStringOption((opt) =>
      opt
        .setName('message')
        .setDescription('Goodbye message. Placeholders: {username} {server} {memberCount}')
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  permissions: [PermissionFlagsBits.Administrator],
  cooldown: 3,
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel', true);
    const message = interaction.options.getString('message') ?? '{username} has left {server}. We now have {memberCount} members.';

    setGoodbyeConfig(interaction.guild.id, { channelId: channel.id, message });
    await interaction.reply({ embeds: [successEmbed('Goodbye System Configured', `Departure messages will be sent in ${channel}.`)] });
  },
};
