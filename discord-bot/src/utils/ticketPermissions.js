// Permission check shared by all ticket-management buttons (claim/done/delete/transcript).
import { PermissionFlagsBits } from 'discord.js';
import { isTicketAccessUser } from './ticketAccess.js';

/** True if the member can manage tickets — either a guild Administrator or on the ticket staff list. */
export function isTicketStaff(interaction) {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  return isTicketAccessUser(interaction.guild.id, interaction.user.id);
}
