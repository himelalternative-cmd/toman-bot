import { SlashCommandBuilder, version as djsVersion } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder().setName('botinfo').setDescription('View information about this bot.'),
  cooldown: 5,
  async execute(interaction) {
    const client = interaction.client;
    const uptimeSeconds = Math.floor(process.uptime());

    const embed = infoEmbed(`${client.user.username}`, null)
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
        { name: 'Users', value: `${client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0)}`, inline: true },
        { name: 'Commands', value: `${client.commands.size}`, inline: true },
        { name: 'discord.js', value: djsVersion, inline: true },
        { name: 'Node.js', value: process.version, inline: true },
        { name: 'Uptime', value: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`, inline: true },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
