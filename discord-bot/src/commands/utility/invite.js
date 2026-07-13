import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder().setName('invite').setDescription('Get an invite link to add this bot to your server.'),
  cooldown: 3,
  async execute(interaction) {
    const link = `https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=${PermissionFlagsBits.Administrator}&scope=bot%20applications.commands`;
    await interaction.reply({ embeds: [infoEmbed('Invite Me', `[Click here to invite ${interaction.client.user.username}](${link})`)], ephemeral: true });
  },
};
