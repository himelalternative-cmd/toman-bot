import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds.js';
import { getBalance, setBalance, addBalance } from '../../utils/zpStorage.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('zp')
    .setDescription('Manage ZP (currency) balances.')
    .addSubcommand((sub) =>
      sub
        .setName('give')
        .setDescription('Give ZP to a user.')
        .addUserOption((opt) => opt.setName('user').setDescription('Target user').setRequired(true))
        .addIntegerOption((opt) =>
          opt.setName('amount').setDescription('Amount of ZP to give').setRequired(true).setMinValue(1),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Set a user\'s ZP balance directly.')
        .addUserOption((opt) => opt.setName('user').setDescription('Target user').setRequired(true))
        .addIntegerOption((opt) =>
          opt.setName('amount').setDescription('New ZP balance').setRequired(true).setMinValue(0),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('check')
        .setDescription('Check a user\'s ZP balance.')
        .addUserOption((opt) => opt.setName('user').setDescription('Target user (leave blank to check your own)').setRequired(false)),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  permissions: [PermissionFlagsBits.Administrator],
  cooldown: 3,

  async execute(interaction) {
    const sub     = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'check') {
      const target = interaction.options.getUser('user') ?? interaction.user;
      const balance = getBalance(guildId, target.id);
      return interaction.reply({
        embeds: [infoEmbed('💰 ZP Balance', `${target}'s balance: **${balance} ZP**`)],
        ephemeral: true,
      });
    }

    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);

    if (sub === 'give') {
      const newBalance = addBalance(guildId, target.id, amount);
      logger.info(`ZP: gave ${amount} ZP to ${target.tag} in guild ${guildId}. New balance: ${newBalance}`);
      return interaction.reply({
        embeds: [
          successEmbed('ZP Given', `Gave **${amount} ZP** to ${target}.\nNew balance: **${newBalance} ZP**`),
        ],
      });
    }

    if (sub === 'set') {
      const newBalance = setBalance(guildId, target.id, amount);
      logger.info(`ZP: set ${target.tag} balance to ${newBalance} in guild ${guildId}`);
      return interaction.reply({
        embeds: [
          successEmbed('ZP Updated', `${target}'s ZP balance has been set to **${newBalance} ZP**`),
        ],
      });
    }
  },
};
