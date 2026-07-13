import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { setLogChannel } from '../../utils/guildConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setlog')
    .setDescription('Set the channel used for moderation logs.')
    .addChannelOption((opt) => opt.setName('channel').setDescription('The channel to send moderation logs to').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  permissions: [PermissionFlagsBits.Administrator],
  cooldown: 3,
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel', true);
    setLogChannel(interaction.guild.id, channel.id);
    await interaction.reply({ embeds: [successEmbed('Log Channel Set', `Moderation logs will now be sent to ${channel}.`)] });
  },
};
