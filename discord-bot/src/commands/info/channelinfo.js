import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

const TYPE_LABELS = {
  [ChannelType.GuildText]: 'Text Channel',
  [ChannelType.GuildVoice]: 'Voice Channel',
  [ChannelType.GuildCategory]: 'Category',
  [ChannelType.GuildAnnouncement]: 'Announcement Channel',
  [ChannelType.GuildForum]: 'Forum Channel',
  [ChannelType.GuildStageVoice]: 'Stage Channel',
};

export default {
  data: new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('View information about a channel.')
    .addChannelOption((opt) => opt.setName('channel').setDescription('The channel to look up (defaults to this one)').setRequired(false)),
  cooldown: 5,
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    const embed = infoEmbed(`#${channel.name}`, null).addFields(
      { name: 'ID', value: channel.id, inline: true },
      { name: 'Type', value: TYPE_LABELS[channel.type] ?? 'Unknown', inline: true },
      { name: 'Category', value: channel.parent?.name ?? 'None', inline: true },
      { name: 'Created', value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:D>`, inline: true },
    );

    if ('topic' in channel && channel.topic) embed.addFields({ name: 'Topic', value: channel.topic });
    if ('rateLimitPerUser' in channel) embed.addFields({ name: 'Slowmode', value: `${channel.rateLimitPerUser}s`, inline: true });

    await interaction.reply({ embeds: [embed] });
  },
};
