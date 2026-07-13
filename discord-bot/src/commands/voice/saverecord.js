import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, AttachmentBuilder } from 'discord.js';
import { existsSync, statSync } from 'node:fs';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { stopRecordingAndMix, isRecording, cleanupRecording } from '../../handlers/recording.js';
import { logger } from '../../utils/logger.js';

// Discord's default (non-boosted) attachment upload limit.
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export default {
  data: new SlashCommandBuilder()
    .setName('save-record')
    .setDescription('Stop the current recording and send it here as an MP3.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 5,
  async execute(interaction) {
    if (interaction.channel.type !== ChannelType.GuildVoice) {
      return interaction.reply({
        embeds: [errorEmbed('BOKACHODA NAKI', 'You can only use the Record command in a VC chat!')],
        ephemeral: true,
      });
    }

    if (!isRecording(interaction.guild.id)) {
      return interaction.reply({ embeds: [errorEmbed('No Active Recording', 'There is no recording in progress in this server.')], ephemeral: true });
    }

    await interaction.deferReply();

    const result = await stopRecordingAndMix(interaction.guild.id).catch((err) => {
      logger.error(`Failed to mix recording for guild ${interaction.guild.id}: ${err}`);
      return undefined;
    });

    if (!result || !result.outputPath || !existsSync(result.outputPath) || statSync(result.outputPath).size === 0) {
      if (result?.dir) cleanupRecording(result.dir);
      return interaction.editReply({ embeds: [errorEmbed('Nothing To Save', 'No audio was captured during this recording.')] });
    }

    const { outputPath, dir } = result;

    if (statSync(outputPath).size > MAX_UPLOAD_BYTES) {
      cleanupRecording(dir);
      return interaction.editReply({
        embeds: [errorEmbed('Recording Too Large', "This recording's MP3 is too large to upload here. Try recording shorter sessions.")],
      });
    }

    const attachment = new AttachmentBuilder(outputPath, { name: 'recording.mp3' });
    await interaction.editReply({ embeds: [successEmbed('Recording Saved', 'Here is the recording of this voice channel.')], files: [attachment] });

    cleanupRecording(dir);
  },
};
