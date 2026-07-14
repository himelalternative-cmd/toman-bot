import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { entersState, VoiceConnectionStatus } from '@discordjs/voice';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { joinChannel } from '../../handlers/voiceManager.js';
import { startRecording, isRecording } from '../../handlers/recording.js';

const CONNECTION_READY_TIMEOUT_MS = 15_000;

export default {
  data: new SlashCommandBuilder()
    .setName('record')
    .setDescription('Start recording audio in this voice channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  permissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [PermissionFlagsBits.Connect],
  cooldown: 5,
  async execute(interaction) {
    // /record only works from a voice channel's own text chat — not a regular text channel.
    if (interaction.channel.type !== ChannelType.GuildVoice) {
      return interaction.reply({
        embeds: [errorEmbed('BOKACHODA NAKI', 'You can only use the Record command in a VC chat!')],
        ephemeral: true,
      });
    }

    if (isRecording(interaction.guild.id)) {
      return interaction.reply({
        embeds: [errorEmbed('Already Recording', 'A recording is already in progress in this server. Use `/save-record` to stop and save it.')],
        ephemeral: true,
      });
    }

    // Joining + waiting for the connection to be Ready can take longer than Discord's
    // 3-second interaction ack window, so defer immediately and edit the reply after.
    await interaction.deferReply();

    let connection;
    try {
      connection = joinChannel(interaction.channel);
    } catch (err) {
      return interaction.editReply({ embeds: [errorEmbed('Could Not Connect', `I couldn't join this voice channel: ${err.message}`)] });
    }

    // Wait until the voice connection is fully established before subscribing to
    // speaking events — starting the session too early means the receiver misses
    // everyone's speaking notifications on a cold join, capturing zero audio.
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, CONNECTION_READY_TIMEOUT_MS);
    } catch (err) {
      return interaction.editReply({
        embeds: [errorEmbed('Could Not Connect', "I couldn't establish a stable voice connection in time. Please try again.")],
      });
    }

    await startRecording(interaction.guild.id, connection);

    await interaction.editReply({
      embeds: [successEmbed('Recording Started', 'I am now recording everyone speaking in this voice channel. Use `/save-record` to stop and get the audio.')],
    });
  },
};
