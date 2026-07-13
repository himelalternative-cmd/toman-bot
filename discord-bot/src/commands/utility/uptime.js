import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder().setName('uptime').setDescription('Check how long the bot has been running.'),
  cooldown: 3,
  async execute(interaction) {
    const uptimeSeconds = Math.floor(process.uptime());
    const startTimestamp = Math.floor((Date.now() - uptimeSeconds * 1000) / 1000);
    await interaction.reply({ embeds: [infoEmbed('Uptime', `Online since <t:${startTimestamp}:R> (<t:${startTimestamp}:f>)`)] });
  },
};
