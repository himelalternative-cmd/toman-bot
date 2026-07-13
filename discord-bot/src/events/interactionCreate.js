// Routes interactions to their handler: slash commands get permission/cooldown
// checks, ticket buttons get routed to handlers/ticketActions.js.
import { PermissionsBitField } from 'discord.js';
import { errorEmbed } from '../utils/embeds.js';
import { missingPermissionReply, missingBotPermissionReply } from '../utils/permissions.js';
import { applyCooldown } from '../utils/cooldowns.js';
import { logger } from '../utils/logger.js';
import {
  handleCreateTicketButton,
  handleClaimButton,
  handleDoneButton,
  handleDeleteButton,
  handleDeleteConfirmButton,
  handleDeleteCancelButton,
  handleTranscriptButton,
} from '../handlers/ticketActions.js';

function permissionLabel(flag) {
  const entry = Object.entries(PermissionsBitField.Flags).find(([, value]) => value === flag);
  return entry ? entry[0].replace(/([A-Z])/g, ' $1').trim() : 'required permission';
}

async function handleTicketTypeSelect(interaction) {
  if (!interaction.inGuild()) return;
  const [, categoryId, supportRoleId] = interaction.customId.split(':');
  const ticketType = interaction.values[0];

  try {
    await handleCreateTicketButton(interaction, categoryId, supportRoleId, ticketType);
  } catch (err) {
    logger.error(`Error handling ticket type select "${interaction.customId}": ${err.stack || err}`);
    const payload = { embeds: [errorEmbed('Something Went Wrong', 'An unexpected error occurred while processing this action.')], ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
}

async function handleTicketButton(interaction) {
  if (!interaction.inGuild()) return;
  const [action, ...rest] = interaction.customId.split(':');

  try {
    switch (action) {
      case 'ticket_claim':
        return await handleClaimButton(interaction, rest[0]);
      case 'ticket_done':
        return await handleDoneButton(interaction, rest[0]);
      case 'ticket_delete':
        return await handleDeleteButton(interaction, rest[0]);
      case 'ticket_delete_confirm':
        return await handleDeleteConfirmButton(interaction, rest[0]);
      case 'ticket_delete_cancel':
        return await handleDeleteCancelButton(interaction);
      case 'ticket_transcript':
        return await handleTranscriptButton(interaction, rest[0]);
      default:
        return; // Not a ticket button — ignore.
    }
  } catch (err) {
    logger.error(`Error handling ticket button "${interaction.customId}": ${err.stack || err}`);
    const payload = { embeds: [errorEmbed('Something Went Wrong', 'An unexpected error occurred while processing this action.')], ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
}

export default {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('ticket_type_select:')) {
      return handleTicketTypeSelect(interaction);
    }
    if (interaction.isButton()) return handleTicketButton(interaction);
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Permission checks — only relevant inside a guild.
    if (interaction.inGuild()) {
      for (const permission of command.permissions ?? []) {
        if (!interaction.memberPermissions?.has(permission)) {
          return missingPermissionReply(interaction, permissionLabel(permission));
        }
      }
      for (const permission of command.botPermissions ?? []) {
        if (!interaction.guild.members.me.permissions.has(permission)) {
          return missingBotPermissionReply(interaction, permissionLabel(permission));
        }
      }
    }

    // Cooldown check.
    const remaining = applyCooldown(client.cooldowns, command, interaction.user.id);
    if (remaining > 0) {
      return interaction.reply({
        embeds: [errorEmbed('Slow down', `Please wait **${remaining.toFixed(1)}s** before using \`/${command.data.name}\` again.`)],
        ephemeral: true,
      });
    }

    try {
      await command.execute(interaction, client);
    } catch (err) {
      logger.error(`Error executing /${command.data.name}: ${err.stack || err}`);
      const payload = { embeds: [errorEmbed('Something Went Wrong', 'An unexpected error occurred while running this command.')], ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  },
};
