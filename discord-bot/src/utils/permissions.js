// Permission and role-hierarchy checks shared by moderation commands.
import { errorEmbed } from './embeds.js';

/** Reply with a consistent "missing permission" embed. */
export function missingPermissionReply(interaction, permissionName) {
  return interaction.reply({
    embeds: [errorEmbed('Missing Permissions', `You need the **${permissionName}** permission to use this command.`)],
    ephemeral: true,
  });
}

export function missingBotPermissionReply(interaction, permissionName) {
  return interaction.reply({
    embeds: [errorEmbed('I Can\'t Do That', `I need the **${permissionName}** permission to run this command.`)],
    ephemeral: true,
  });
}

/**
 * Ensures the invoking member outranks the target member (or is the guild owner).
 * Returns null when the check passes, or a reason string when it fails.
 */
export function checkUserHierarchy(interaction, targetMember) {
  if (interaction.guild.ownerId === interaction.user.id) return null;
  if (targetMember.id === interaction.guild.ownerId) return 'You cannot take action against the server owner.';
  if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
    return 'You cannot take action against a member with an equal or higher role than you.';
  }
  return null;
}

/** Ensures the bot outranks the target member. */
export function checkBotHierarchy(interaction, targetMember) {
  if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
    return "I cannot take action against this member — their role is equal to or higher than mine.";
  }
  return null;
}
