import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { EMBED_COLORS, FOOTER_TEXT } from '../../config/config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('createticketpanel')
    .setDescription('Create a professional support ticket panel with a Create Ticket button.')
    .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to post the panel in').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addChannelOption((opt) =>
      opt.setName('category').setDescription('Category new ticket channels will be created under').addChannelTypes(ChannelType.GuildCategory).setRequired(true),
    )
    .addStringOption((opt) => opt.setName('title').setDescription('Embed title').setRequired(true))
    .addStringOption((opt) => opt.setName('description').setDescription('Embed description').setRequired(true))
    .addRoleOption((opt) => opt.setName('support_role').setDescription('Role to mention and grant access on new tickets').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  permissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  cooldown: 5,
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel', true);
    const category = interaction.options.getChannel('category', true);
    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description', true);
    const supportRole = interaction.options.getRole('support_role');

    const panelEmbed = new EmbedBuilder()
      .setColor(EMBED_COLORS.primary)
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: FOOTER_TEXT })
      .setTimestamp()
      .setThumbnail(interaction.guild.iconURL());

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_create:${category.id}:${supportRole?.id ?? 'none'}`)
        .setLabel('Create Ticket')
        .setEmoji('🎫')
        .setStyle(ButtonStyle.Primary),
    );

    await channel.send({ embeds: [panelEmbed], components: [row] });
    await interaction.reply({ embeds: [successEmbed('Ticket Panel Created', `The panel was posted in ${channel}.`)], ephemeral: true });
  },
};
