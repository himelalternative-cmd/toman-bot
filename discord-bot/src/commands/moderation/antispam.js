import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds.js';
import { isAntiSpamEnabled, setAntiSpamEnabled } from '../../utils/antiSpamStorage.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('anti-spam')
    .setDescription('Enable or disable the auto anti-spam system for this server.')
    .addSubcommand((sub) =>
      sub
        .setName('enable')
        .setDescription('Turn on anti-spam protection for this server.'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('Turn off anti-spam protection for this server.'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Check whether anti-spam is currently enabled.'),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  permissions: [PermissionFlagsBits.ManageGuild],
  cooldown: 5,

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'status') {
      const enabled = isAntiSpamEnabled(guildId);
      return interaction.reply({
        embeds: [
          infoEmbed(
            '🛡️ Anti-Spam Status',
            `Anti-spam is currently **${enabled ? 'enabled ✅' : 'disabled ❌'}** in this server.\n\n` +
              '**Rules when enabled:**\n' +
              '• 4+ messages in 5 seconds → all messages auto-deleted\n' +
              '• 10+ messages in 10 seconds → all messages deleted + **3-day timeout**',
          ),
        ],
        ephemeral: true,
      });
    }

    if (sub === 'enable') {
      if (isAntiSpamEnabled(guildId)) {
        return interaction.reply({
          embeds: [errorEmbed('Already Enabled', 'Anti-spam is already enabled in this server.')],
          ephemeral: true,
        });
      }
      setAntiSpamEnabled(guildId, true);
      logger.info(`Anti-spam enabled in guild ${guildId} by ${interaction.user.tag}`);
      return interaction.reply({
        embeds: [
          successEmbed(
            'Anti-Spam Enabled',
            'Anti-spam protection is now **active**.\n\n' +
              '**Rules:**\n' +
              '• 4+ messages in 5 seconds → all messages auto-deleted\n' +
              '• 10+ messages in 10 seconds → all messages deleted + **3-day timeout**',
          ),
        ],
      });
    }

    if (sub === 'disable') {
      if (!isAntiSpamEnabled(guildId)) {
        return interaction.reply({
          embeds: [errorEmbed('Already Disabled', 'Anti-spam is already disabled in this server.')],
          ephemeral: true,
        });
      }
      setAntiSpamEnabled(guildId, false);
      logger.info(`Anti-spam disabled in guild ${guildId} by ${interaction.user.tag}`);
      return interaction.reply({
        embeds: [successEmbed('Anti-Spam Disabled', 'Anti-spam protection has been turned **off**.')],
      });
    }
  },
};
