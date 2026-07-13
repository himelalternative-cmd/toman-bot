import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription("View a member's avatar.")
    .addUserOption((opt) => opt.setName('target').setDescription('The member to look up').setRequired(false)),
  cooldown: 5,
  async execute(interaction) {
    const target = interaction.options.getUser('target') ?? interaction.user;
    const embed = infoEmbed(`${target.tag}'s Avatar`, null).setImage(target.displayAvatarURL({ size: 1024 }));
    await interaction.reply({ embeds: [embed] });
  },
};
