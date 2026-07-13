import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription("View a member's profile banner.")
    .addUserOption((opt) => opt.setName('target').setDescription('The member to look up').setRequired(false)),
  cooldown: 5,
  async execute(interaction) {
    const target = interaction.options.getUser('target') ?? interaction.user;
    const fullUser = await interaction.client.users.fetch(target.id, { force: true });

    if (!fullUser.bannerURL()) {
      return interaction.reply({ embeds: [errorEmbed('No Banner', `**${fullUser.tag}** does not have a profile banner set.`)], ephemeral: true });
    }

    await interaction.reply({ embeds: [infoEmbed(`${fullUser.tag}'s Banner`, null).setImage(fullUser.bannerURL({ size: 1024 }))] });
  },
};
