import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

const CATEGORY_LABELS = {
  moderation: '🛡️ Moderation',
  utility: '🔧 Utility',
  info: 'ℹ️ Info',
  admin: '⚙️ Admin',
  fun: '🎉 Fun',
};

export default {
  data: new SlashCommandBuilder().setName('help').setDescription('List all available commands.'),
  cooldown: 3,
  async execute(interaction, client) {
    const grouped = new Map();

    for (const command of client.commands.values()) {
      const category = command.category ?? 'other';
      if (!grouped.has(category)) grouped.set(category, []);
      grouped.get(category).push(`\`/${command.data.name}\` — ${command.data.description}`);
    }

    const embed = infoEmbed('Command List', `Here's everything I can do. Use \`/\` in chat to see live autocomplete.`);
    for (const [category, lines] of grouped) {
      embed.addFields({ name: CATEGORY_LABELS[category] ?? category, value: lines.join('\n') });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
