import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { enable247, disable247 } from '../../handlers/voiceManager.js';

export default {
  data: new SlashCommandBuilder()
    .setName('247')
    .setDescription('Keep the bot connected to a voice channel 24/7.')
    .addSubcommand((sub) =>
      sub
        .setName('enable')
        .setDescription('Enable 24/7 mode')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Voice channel to stay connected to (defaults to your current voice channel)')
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) => sub.setName('disable').setDescription('Disable 24/7 mode and leave the voice channel'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  permissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
  cooldown: 5,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'disable') {
      disable247(interaction.guild.id);
      return interaction.reply({ embeds: [successEmbed('24/7 Mode Disabled', 'I have left the voice channel and will not auto-rejoin.')] });
    }

    const channel = interaction.options.getChannel('channel') ?? interaction.member.voice.channel;
    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return interaction.reply({
        embeds: [errorEmbed('No Voice Channel', 'Join a voice channel first, or specify one with the `channel` option.')],
        ephemeral: true,
      });
    }

    try {
      enable247(channel);
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('Could Not Connect', `I couldn't join ${channel}: ${err.message}`)], ephemeral: true });
    }

    await interaction.reply({
      embeds: [successEmbed('24/7 Mode Enabled', `I'll stay connected to ${channel} and automatically rejoin if I ever get disconnected.`)],
    });
  },
};
