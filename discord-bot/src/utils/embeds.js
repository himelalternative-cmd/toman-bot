// Shared embed builders so every command replies with a consistent look.
import { EmbedBuilder } from 'discord.js';
import { EMBED_COLORS, FOOTER_TEXT } from '../config/config.js';

function baseEmbed(color) {
  return new EmbedBuilder().setColor(color).setFooter({ text: FOOTER_TEXT }).setTimestamp();
}

export function successEmbed(title, description) {
  return baseEmbed(EMBED_COLORS.success).setTitle(`✅ ${title}`).setDescription(description ?? null);
}

export function errorEmbed(title, description) {
  return baseEmbed(EMBED_COLORS.error).setTitle(`❌ ${title}`).setDescription(description ?? null);
}

export function infoEmbed(title, description) {
  return baseEmbed(EMBED_COLORS.primary).setTitle(title).setDescription(description ?? null);
}

export function warningEmbed(title, description) {
  return baseEmbed(EMBED_COLORS.warning).setTitle(`⚠️ ${title}`).setDescription(description ?? null);
}

/**
 * Standard moderation log embed used across ban/kick/timeout/warn/etc.
 * @param {string} action - Human-readable action name, e.g. "Member Banned".
 * @param {import('discord.js').User} moderator
 * @param {import('discord.js').User} target
 * @param {string} [reason]
 * @param {{name: string, value: string}[]} [extraFields]
 */
export function moderationLogEmbed(action, moderator, target, reason = 'No reason provided', extraFields = []) {
  return baseEmbed(EMBED_COLORS.primary)
    .setTitle(action)
    .addFields(
      { name: 'Target', value: `${target.tag} (${target.id})`, inline: true },
      { name: 'Moderator', value: `${moderator.tag} (${moderator.id})`, inline: true },
      { name: 'Reason', value: reason },
      ...extraFields,
    )
    .setThumbnail(target.displayAvatarURL());
}
