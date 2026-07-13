import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { setTranscriptChannel } from '../../utils/guildConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('settranscriptchannel')
    .setDescription('Set the channel where ticket transcripts are sent.')
    .addChannelOption((opt) => opt.setName('channel').setDescription('The channel to send transcripts to').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  permissions: [PermissionFlagsBits.Administrator],
  cooldown: 3,
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel', true);
    setTranscriptChannel(interaction.guild.id, channel.id);
    await interaction.reply({ embeds: [successEmbed('Transcript Channel Set', `Ticket transcripts will now be sent to ${channel}.`)] });
  },
};
