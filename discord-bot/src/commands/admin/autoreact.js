import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { setAutoReact, removeAutoReact, getAutoReactEmojis } from '../../utils/autoReactStorage.js';

// Splits the raw emojis string into individual tokens (unicode emoji or
// Discord custom-emoji format <:name:id> / <a:name:id>), ignoring extra whitespace.
function parseEmojis(raw) {
  return raw
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export default {
  data: new SlashCommandBuilder()
    .setName('autoreact')
    .setDescription('Automatically react to every message posted in a channel.')
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('React to every new message in a channel with the given emojis')
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to auto-react in').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addStringOption((opt) => opt.setName('emojis').setDescription('One or more emojis, separated by spaces (e.g. 👍 🎉 <:pepe:123456789012345678>)').setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Stop auto-reacting in a channel')
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel to stop auto-reacting in').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  permissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [PermissionFlagsBits.AddReactions],
  cooldown: 3,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel('channel', true);

    if (sub === 'remove') {
      if (!getAutoReactEmojis(interaction.guild.id, channel.id)) {
        return interaction.reply({ embeds: [errorEmbed('Not Configured', `Auto-react is not set up in ${channel}.`)], ephemeral: true });
      }
      removeAutoReact(interaction.guild.id, channel.id);
      return interaction.reply({ embeds: [successEmbed('Auto-React Removed', `I will no longer auto-react to messages in ${channel}.`)] });
    }

    const rawEmojis = interaction.options.getString('emojis', true);
    const emojis = parseEmojis(rawEmojis);

    if (emojis.length === 0) {
      return interaction.reply({ embeds: [errorEmbed('No Emojis Given', 'Provide at least one emoji.')], ephemeral: true });
    }
    if (emojis.length > 20) {
      return interaction.reply({ embeds: [errorEmbed('Too Many Emojis', 'Discord allows at most 20 reactions per message.')], ephemeral: true });
    }

    // Validate every emoji can actually be used as a reaction before saving.
    const testMessage = await interaction.channel.send({ embeds: [successEmbed('Testing Auto-React', 'Verifying the emojis you provided...')] }).catch(() => null);
    if (!testMessage) {
      return interaction.reply({ embeds: [errorEmbed('Setup Failed', "I couldn't send a test message in this channel to verify the emojis.")], ephemeral: true });
    }

    const invalid = [];
    for (const emoji of emojis) {
      try {
        await testMessage.react(emoji);
      } catch {
        invalid.push(emoji);
      }
    }
    await testMessage.delete().catch(() => {});

    if (invalid.length > 0) {
      return interaction.reply({
        embeds: [errorEmbed('Invalid Emoji(s)', `I couldn't react with: ${invalid.join(' ')}\nMake sure custom emojis are from a server I'm in.`)],
        ephemeral: true,
      });
    }

    setAutoReact(interaction.guild.id, channel.id, emojis);
    await interaction.reply({ embeds: [successEmbed('Auto-React Configured', `I'll now react with ${emojis.join(' ')} to every message posted in ${channel}.`)] });
  },
};
