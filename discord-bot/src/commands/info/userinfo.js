import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('View information about a member.')
    .addUserOption((opt) => opt.setName('target').setDescription('The member to look up').setRequired(false)),
  cooldown: 5,
  async execute(interaction) {
    const target = interaction.options.getUser('target') ?? interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    const embed = infoEmbed(target.tag, null).setThumbnail(target.displayAvatarURL({ size: 256 })).addFields(
      { name: 'ID', value: target.id, inline: true },
      { name: 'Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:D>`, inline: true },
    );

    if (member) {
      embed.addFields(
        { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`, inline: true },
        { name: 'Roles', value: member.roles.cache.size > 1 ? member.roles.cache.filter((r) => r.id !== interaction.guild.id).map((r) => `${r}`).join(', ') : 'None' },
      );
    }

    await interaction.reply({ embeds: [embed] });
  },
};
