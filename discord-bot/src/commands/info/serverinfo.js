import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder().setName('serverinfo').setDescription('View information about this server.'),
  cooldown: 5,
  async execute(interaction) {
    const guild = interaction.guild;
    const owner = await guild.fetchOwner().catch(() => null);

    const embed = infoEmbed(guild.name, null)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: 'Owner', value: owner ? `${owner.user.tag}` : 'Unknown', inline: true },
        { name: 'Members', value: `${guild.memberCount}`, inline: true },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
        { name: 'Boost Level', value: `${guild.premiumTier}`, inline: true },
        { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
