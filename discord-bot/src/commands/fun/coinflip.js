import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder().setName('coinflip').setDescription('Flip a coin.'),
  cooldown: 2,
  async execute(interaction) {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    await interaction.reply({ embeds: [infoEmbed('🪙 Coin Flip', `It landed on **${result}**!`)] });
  },
};
