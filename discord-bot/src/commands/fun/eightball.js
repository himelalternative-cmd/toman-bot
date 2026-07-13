import { SlashCommandBuilder } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

const RESPONSES = [
  'It is certain.',
  'Without a doubt.',
  'Yes, definitely.',
  'You may rely on it.',
  'As I see it, yes.',
  'Most likely.',
  'Outlook good.',
  'Signs point to yes.',
  'Reply hazy, try again.',
  'Ask again later.',
  'Better not tell you now.',
  'Cannot predict now.',
  "Don't count on it.",
  'My reply is no.',
  'My sources say no.',
  'Outlook not so good.',
  'Very doubtful.',
];

export default {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a question.')
    .addStringOption((opt) => opt.setName('question').setDescription('Your question').setRequired(true)),
  cooldown: 2,
  async execute(interaction) {
    const question = interaction.options.getString('question', true);
    const answer = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
    await interaction.reply({ embeds: [infoEmbed('🎱 Magic 8-Ball', `**Q:** ${question}\n**A:** ${answer}`)] });
  },
};
