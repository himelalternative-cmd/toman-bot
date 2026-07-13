import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder().setName('ping').setDescription("Check the bot's latency."),
  cooldown: 3,
  async execute(interaction) {
    const sent = await interaction.reply({ embeds: [infoEmbed('Pinging...', null)], fetchReply: true });
    const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply({
      embeds: [infoEmbed('🏓 Pong!', `**Roundtrip:** ${roundTrip}ms\n**WebSocket:** ${interaction.client.ws.ping}ms`)],
    });
  },
};
