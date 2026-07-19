// Handles all !rbxacc prefix command + Buy Robux button + modal + Done Order button.
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
} from 'discord.js';
import { getBalance, deductBalance } from '../utils/zpStorage.js';
import { createOrder, getOrder, completeOrder } from '../utils/rbxOrderStorage.js';
import { getRbxAllowedRoles, getOrderChannel } from '../utils/guildConfig.js';
import { isTicketAccessUser } from '../utils/ticketAccess.js';
import { successEmbed, errorEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

const ZP_PER_ROBUX = 0.9; // 1 Robux = 0.9 ZP

// ─── Permission helper ─────────────────────────────────────────────────────────

function canUseRbxAcc(message) {
  const member = message.member;
  if (!member) return false;
  // Admins always allowed
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  // Ticket staff allow-list (user IDs)
  if (isTicketAccessUser(message.guild.id, message.author.id)) return true;
  // Guild-configured allowed roles
  const allowedRoles = getRbxAllowedRoles(message.guild.id);
  return allowedRoles.length > 0 && member.roles.cache.some((r) => allowedRoles.includes(r.id));
}

// ─── !rbxacc → send the purchase panel ────────────────────────────────────────

export async function handleRbxAccCommand(message) {
  if (!canUseRbxAcc(message)) return; // silently ignore unauthorised users

  const embed = new EmbedBuilder()
    .setColor(0x000000)
    .setTitle('🎮 Robux Shop')
    .setDescription(
      'Want to buy Robux? Fill in the form below and we will process your order.\n\n' +
        '**Rate:** 1 Robux = **0.9 ZP**\n' +
        'Your ZP balance will be deducted automatically upon submission.',
    )
    .setFooter({ text: 'TOMAN • Robux Shop' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('rbxacc_buy')
      .setLabel('Buy Robux')
      .setEmoji('🎮')
      .setStyle(ButtonStyle.Success),
  );

  await message.channel.send({ embeds: [embed], components: [row] });

  // Delete the command message to keep the channel clean
  await message.delete().catch(() => {});
}

// ─── "Buy Robux" button → open modal ──────────────────────────────────────────

export async function handleBuyRobuxButton(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('rbxacc_order_modal')
    .setTitle('Robux Purchase Form');

  const usernameInput = new TextInputBuilder()
    .setCustomId('roblox_username')
    .setLabel('Roblox Username')
    .setPlaceholder('Enter your Roblox username')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  const amountInput = new TextInputBuilder()
    .setCustomId('robux_amount')
    .setLabel('How much Robux do you want to buy?')
    .setPlaceholder('e.g. 100')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(10);

  modal.addComponents(
    new ActionRowBuilder().addComponents(usernameInput),
    new ActionRowBuilder().addComponents(amountInput),
  );

  await interaction.showModal(modal);
}

// ─── Modal submit → deduct ZP, create order, send ticket confirmation ──────────

export async function handleRbxModal(interaction) {
  const robloxUsername = interaction.fields.getTextInputValue('roblox_username').trim();
  const rawAmount      = interaction.fields.getTextInputValue('robux_amount').trim();

  const robuxAmount = parseInt(rawAmount, 10);
  if (isNaN(robuxAmount) || robuxAmount <= 0) {
    return interaction.reply({
      embeds: [errorEmbed('Invalid Amount', 'Please enter a valid positive number for Robux amount.')],
      ephemeral: true,
    });
  }

  const zpCost    = Math.ceil(robuxAmount * ZP_PER_ROBUX);
  const guildId   = interaction.guild.id;
  const userId    = interaction.user.id;
  const balance   = getBalance(guildId, userId);

  if (balance < zpCost) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Insufficient ZP',
          `You need **${zpCost} ZP** for ${robuxAmount} Robux but only have **${balance} ZP**.`,
        ),
      ],
      ephemeral: true,
    });
  }

  // Deduct ZP
  const deduction = deductBalance(guildId, userId, zpCost);
  if (!deduction.success) {
    return interaction.reply({
      embeds: [errorEmbed('Insufficient ZP', `You don't have enough ZP. Balance: **${deduction.currentBalance} ZP**`)],
      ephemeral: true,
    });
  }

  // Create order record
  const order = createOrder(guildId, {
    userId,
    userTag:       interaction.user.tag,
    robloxUsername,
    robuxAmount,
    zpDeducted:    zpCost,
    channelId:     interaction.channel.id,
  });

  logger.info(`Robux order #${order.orderId} created by ${interaction.user.tag} in guild ${guildId}`);

  // Order confirmation embed (posted in the ticket channel)
  const confirmEmbed = new EmbedBuilder()
    .setColor(0x000000)
    .setTitle('✅ Robux Order Placed Successfully')
    .setDescription(
      'Your Robux Order is Placed Successfully. Wait for an admin or owner to Complete Your Order. Thanks.',
    )
    .addFields(
      { name: '📋 Order ID',        value: `#${order.orderId}`,          inline: true },
      { name: '🎮 Roblox Username', value: robloxUsername,                inline: true },
      { name: '💎 Robux Amount',    value: `${robuxAmount}`,              inline: true },
      { name: '💰 ZP Deducted',     value: `${zpCost} ZP`,               inline: true },
      { name: '💳 Remaining ZP',    value: `${deduction.newBalance} ZP`, inline: true },
    )
    .setFooter({ text: 'TOMAN • Robux Shop' })
    .setTimestamp();

  const doneRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rbxacc_done:${order.orderId}`)
      .setLabel('Done Order')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Primary),
  );

  await interaction.reply({ embeds: [confirmEmbed], components: [doneRow] });
}

// ─── "Done Order" button → post to order channel ──────────────────────────────

export async function handleDoneOrderButton(interaction, orderId) {
  if (!interaction.member?.permissions.has(PermissionFlagsBits.Administrator) &&
      !isTicketAccessUser(interaction.guild.id, interaction.user.id)) {
    return interaction.reply({
      embeds: [errorEmbed('No Permission', 'Only admins or ticket staff can mark orders as done.')],
      ephemeral: true,
    });
  }

  const guildId = interaction.guild.id;
  const order   = getOrder(guildId, orderId);

  if (!order) {
    return interaction.reply({
      embeds: [errorEmbed('Order Not Found', `Order #${orderId} does not exist.`)],
      ephemeral: true,
    });
  }

  if (order.status === 'completed') {
    return interaction.reply({
      embeds: [errorEmbed('Already Completed', `Order #${orderId} has already been marked as done.`)],
      ephemeral: true,
    });
  }

  completeOrder(guildId, orderId);

  const orderChannel = await getOrderChannel(interaction.guild);
  if (!orderChannel) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Order Channel Not Set',
          'No order channel is configured. Ask an admin to run `/rbxsetup orderchannel #channel`.',
        ),
      ],
      ephemeral: true,
    });
  }

  const orderEmbed = new EmbedBuilder()
    .setColor(0x000000)
    .setTitle('📦 New Robux Order')
    .addFields(
      { name: '📋 Order ID',        value: `#${order.orderId}`,   inline: true },
      { name: '👤 Ordered By',      value: `<@${order.userId}>`,  inline: true },
      { name: '🎮 Roblox Username', value: order.robloxUsername,  inline: true },
      { name: '💎 Robux Amount',    value: `${order.robuxAmount}`, inline: true },
      { name: '💰 ZP Paid',         value: `${order.zpDeducted} ZP`, inline: true },
      { name: '✅ Marked Done By',  value: `${interaction.user}`, inline: true },
    )
    .setFooter({ text: 'TOMAN • Robux Shop' })
    .setTimestamp();

  await orderChannel.send({ embeds: [orderEmbed] });

  // Disable the Done Order button
  await interaction.update({
    embeds: interaction.message.embeds,
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rbxacc_done:${orderId}`)
          .setLabel('Order Completed')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
      ),
    ],
  });

  logger.info(`Robux order #${orderId} marked done by ${interaction.user.tag} in guild ${guildId}`);
}
