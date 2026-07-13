// Routes slash-command interactions to their handler, with permission and cooldown checks.
import { PermissionsBitField } from 'discord.js';
import { errorEmbed } from '../utils/embeds.js';
import { missingPermissionReply, missingBotPermissionReply } from '../utils/permissions.js';
import { applyCooldown } from '../utils/cooldowns.js';
import { logger } from '../utils/logger.js';

function permissionLabel(flag) {
  const entry = Object.entries(PermissionsBitField.Flags).find(([, value]) => value === flag);
  return entry ? entry[0].replace(/([A-Z])/g, ' $1').trim() : 'required permission';
}

export default {
  name: 'interactionCreate',
  async execute(interaction, client) {
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
