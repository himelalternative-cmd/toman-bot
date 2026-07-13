// Handles every ticket-related button interaction: create, claim, mark done,
// delete (with confirmation), and delete + transcript. Also exposes a sweep
// function the entry point polls to auto-close "done" tickets after 12 hours.
import { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { successEmbed, errorEmbed, infoEmbed } from '../utils/embeds.js';
import {
  createTicket,
  getTicket,
  getOpenTicketForUser,
  updateTicket,
  removeTicket,
  getDoneTicketsPastDeadline,
} from '../utils/tickets.js';
import { getTicketAccessList } from '../utils/ticketAccess.js';
import { isTicketStaff } from '../utils/ticketPermissions.js';
import { getLogChannel, getTranscriptChannel } from '../utils/guildConfig.js';
import { generateHtmlTranscript, generateTextTranscript } from '../utils/transcripts.js';
import { slugify } from '../utils/strings.js';
import { logger } from '../utils/logger.js';

export const TICKET_DONE_WINDOW_MS = 12 * 60 * 60 * 1000;

function ticketButtonRow(ticketId, { claimDisabled = false, doneDisabled = false } = {}) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket_claim:${ticketId}`).setLabel('Claim').setEmoji('📌').setStyle(ButtonStyle.Primary).setDisabled(claimDisabled),
    new ButtonBuilder().setCustomId(`ticket_done:${ticketId}`).setLabel('Mark as Done').setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(doneDisabled),
    new ButtonBuilder().setCustomId(`ticket_delete:${ticketId}`).setLabel('Delete Ticket').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`ticket_transcript:${ticketId}`).setLabel('Delete + Transcript').setEmoji('📄').setStyle(ButtonStyle.Secondary),
  );
}

async function updateTicketButtons(message, ticketId, { claimDisabled, doneDisabled } = {}) {
  if (!message) return;
  const existingClaimDisabled = message.components?.[0]?.components?.[0]?.disabled ?? false;
  const existingDoneDisabled = message.components?.[0]?.components?.[1]?.disabled ?? false;
  await message
    .edit({
      components: [
        ticketButtonRow(ticketId, {
          claimDisabled: claimDisabled ?? existingClaimDisabled,
          doneDisabled: doneDisabled ?? existingDoneDisabled,
        }),
      ],
    })
    .catch(() => {});
}

async function logTicketEvent(guild, title, description) {
  const logChannel = await getLogChannel(guild);
  if (!logChannel) return;
  await logChannel.send({ embeds: [infoEmbed(title, description)] }).catch(() => {});
}

export async function handleCreateTicketButton(interaction, categoryId, supportRoleId) {
  const guild = interaction.guild;

  const existing = getOpenTicketForUser(guild.id, interaction.user.id);
  if (existing) {
    return interaction.reply({
      embeds: [errorEmbed('Ticket Already Open', `You already have an open ticket: <#${existing.channelId}>`)],
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const category = guild.channels.cache.get(categoryId) ?? (await guild.channels.fetch(categoryId).catch(() => null));
  if (!category || category.type !== ChannelType.GuildCategory) {
    return interaction.editReply({
      embeds: [errorEmbed('Setup Error', 'The configured ticket category no longer exists. Ask an admin to recreate the panel.')],
    });
  }

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
    },
    {
      id: guild.members.me.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory],
    },
  ];

  for (const userId of getTicketAccessList(guild.id)) {
    overwrites.push({ id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  }

  if (supportRoleId && supportRoleId !== 'none') {
    overwrites.push({ id: supportRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  }

  let channel;
  try {
    channel = await guild.channels.create({
      name: `ticket-${slugify(interaction.user.username)}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: overwrites,
    });
  } catch (err) {
    logger.error(`Failed to create ticket channel: ${err}`);
    return interaction.editReply({
      embeds: [errorEmbed('Ticket Creation Failed', 'I could not create the ticket channel — check my Manage Channels permission.')],
    });
  }

  const ticket = createTicket(guild.id, { userId: interaction.user.id, channelId: channel.id });

  const infoEmbedMsg = infoEmbed('🎫 Support Ticket', 'A member of our team will be with you shortly.')
    .addFields(
      { name: 'Opened By', value: `${interaction.user}`, inline: true },
      { name: 'Created', value: `<t:${Math.floor(ticket.createdAt / 1000)}:f>`, inline: true },
      { name: 'Ticket ID', value: `#${ticket.id}`, inline: true },
      { name: 'Claim Status', value: 'Unclaimed', inline: true },
      { name: 'Status', value: 'Open', inline: true },
    )
    .setThumbnail(guild.iconURL());

  const mention = supportRoleId && supportRoleId !== 'none' ? `<@&${supportRoleId}> ` : '';
  await channel.send({ content: `${mention}${interaction.user}`, embeds: [infoEmbedMsg], components: [ticketButtonRow(ticket.id)] });

  await interaction.editReply({ embeds: [successEmbed('Ticket Created', `Your ticket has been created: ${channel}`)] });

  await logTicketEvent(guild, 'Ticket Created', `Ticket #${ticket.id} opened by ${interaction.user.tag} in ${channel}.`);
}

export async function handleClaimButton(interaction, ticketId) {
  const guild = interaction.guild;
  const ticket = getTicket(guild.id, ticketId);
  if (!ticket) return interaction.reply({ embeds: [errorEmbed('Ticket Not Found', 'This ticket no longer exists.')], ephemeral: true });

  if (!isTicketStaff(interaction)) {
    return interaction.reply({ embeds: [errorEmbed('Missing Permissions', 'Only administrators or ticket staff can claim tickets.')], ephemeral: true });
  }
  if (ticket.claimed) {
    return interaction.reply({ embeds: [errorEmbed('Already Claimed', `This ticket is already claimed by <@${ticket.claimedBy}>.`)], ephemeral: true });
  }

  updateTicket(guild.id, ticketId, { claimed: true, claimedBy: interaction.user.id });
  await interaction.channel.setName(`claimed-${slugify(interaction.user.username)}`).catch(() => {});

  await interaction.reply({ embeds: [successEmbed('Ticket Claimed', `**Claimed By:** ${interaction.user}`)] });
  await updateTicketButtons(interaction.message, ticketId, { claimDisabled: true });
  await logTicketEvent(guild, 'Ticket Claimed', `Ticket #${ticketId} claimed by ${interaction.user.tag}.`);
}

export async function handleDoneButton(interaction, ticketId) {
  const guild = interaction.guild;
  const ticket = getTicket(guild.id, ticketId);
  if (!ticket) return interaction.reply({ embeds: [errorEmbed('Ticket Not Found', 'This ticket no longer exists.')], ephemeral: true });

  if (!isTicketStaff(interaction)) {
    return interaction.reply({ embeds: [errorEmbed('Missing Permissions', 'Only administrators or ticket staff can mark tickets as done.')], ephemeral: true });
  }
  if (ticket.status === 'done') {
    return interaction.reply({ embeds: [errorEmbed('Already Marked Done', 'This ticket has already been marked as done.')], ephemeral: true });
  }

  updateTicket(guild.id, ticketId, { status: 'done', doneAt: Date.now() });
  await interaction.channel.setName(`done-${slugify(interaction.user.username)}`).catch(() => {});

  await interaction.reply({ embeds: [successEmbed('Ticket Marked as Completed', 'This ticket will automatically close in **12 hours**.')] });
  await updateTicketButtons(interaction.message, ticketId, { doneDisabled: true });
  await logTicketEvent(guild, 'Ticket Marked Done', `Ticket #${ticketId} marked done by ${interaction.user.tag}.`);
}

export async function handleDeleteButton(interaction, ticketId) {
  const guild = interaction.guild;
  const ticket = getTicket(guild.id, ticketId);
  if (!ticket) return interaction.reply({ embeds: [errorEmbed('Ticket Not Found', 'This ticket no longer exists.')], ephemeral: true });

  if (!isTicketStaff(interaction)) {
    return interaction.reply({ embeds: [errorEmbed('Missing Permissions', 'Only administrators or ticket staff can delete tickets.')], ephemeral: true });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket_delete_confirm:${ticketId}`).setLabel('Yes, Delete').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`ticket_delete_cancel:${ticketId}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({
    embeds: [errorEmbed('Delete This Ticket?', 'This will permanently delete the channel. This cannot be undone.')],
    components: [row],
    ephemeral: true,
  });
}

export async function handleDeleteConfirmButton(interaction, ticketId) {
  const guild = interaction.guild;
  const ticket = getTicket(guild.id, ticketId);
  if (!ticket) {
    return interaction.update({ embeds: [errorEmbed('Ticket Not Found', 'This ticket no longer exists.')], components: [] });
  }

  await interaction.update({ embeds: [successEmbed('Deleting Ticket', 'This channel will be deleted shortly.')], components: [] });

  removeTicket(guild.id, ticketId);
  await logTicketEvent(guild, 'Ticket Deleted', `Ticket #${ticketId} deleted by ${interaction.user.tag}.`);

  const channel = guild.channels.cache.get(ticket.channelId);
  if (channel) await channel.delete().catch(() => {});
}

export async function handleDeleteCancelButton(interaction) {
  await interaction.update({ embeds: [infoEmbed('Cancelled', 'Ticket deletion cancelled.')], components: [] });
}

export async function handleTranscriptButton(interaction, ticketId) {
  const guild = interaction.guild;
  const ticket = getTicket(guild.id, ticketId);
  if (!ticket) return interaction.reply({ embeds: [errorEmbed('Ticket Not Found', 'This ticket no longer exists.')], ephemeral: true });

  if (!isTicketStaff(interaction)) {
    return interaction.reply({ embeds: [errorEmbed('Missing Permissions', 'Only administrators or ticket staff can generate transcripts.')], ephemeral: true });
  }

  await interaction.reply({ embeds: [infoEmbed('Generating Transcript', 'Please wait while the transcript is generated...')], ephemeral: true });

  const channel = interaction.channel;
  const [htmlAttachment, txtAttachment] = await Promise.all([
    generateHtmlTranscript(channel, ticketId),
    generateTextTranscript(channel, ticketId),
  ]);

  const transcriptChannel = await getTranscriptChannel(guild);
  if (transcriptChannel) {
    await transcriptChannel
      .send({
        embeds: [infoEmbed('Ticket Transcript', `Ticket #${ticketId} — opened by <@${ticket.userId}>, closed by ${interaction.user}.`)],
        files: [htmlAttachment, txtAttachment],
      })
      .catch((err) => logger.error(`Failed to send transcript: ${err}`));
  } else {
    logger.warn(`No transcript channel configured for guild ${guild.id} — transcript for ticket #${ticketId} was generated but not sent anywhere.`);
  }

  await logTicketEvent(guild, 'Transcript Created', `Transcript generated for ticket #${ticketId} by ${interaction.user.tag}.`);

  removeTicket(guild.id, ticketId);
  await logTicketEvent(guild, 'Ticket Deleted', `Ticket #${ticketId} deleted (with transcript) by ${interaction.user.tag}.`);

  await channel.delete().catch(() => {});
}

/** Polled periodically from index.js — auto-deletes "done" tickets past the 12-hour window. */
export async function sweepDoneTickets(client) {
  const due = getDoneTicketsPastDeadline(TICKET_DONE_WINDOW_MS);

  for (const { guildId, ticket } of due) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      removeTicket(guildId, ticket.id);
      continue;
    }

    const channel = guild.channels.cache.get(ticket.channelId);
    removeTicket(guildId, ticket.id);
    if (channel) await channel.delete().catch(() => {});
    await logTicketEvent(guild, 'Ticket Deleted', `Ticket #${ticket.id} auto-deleted after the 12-hour completion window.`);
  }
}
