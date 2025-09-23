const { SlashCommandBuilder } = require('discord.js');
const CommandUtils = require('../utils/commandUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View your quiz statistics')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Check another user\'s stats (optional)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Show stats for specific category')
                .setRequired(false)
                .addChoices(
                    { name: 'TLD Quiz', value: 'tld' },
                    { name: 'Flags Quiz', value: 'flags' }
                )),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const category = interaction.options.getString('category');

        try {
            const result = await CommandUtils.generateStatsEmbed(targetUser, category, true);

            if (result.error) {
                await interaction.reply({
                    content: `❌ ${result.error}`,
                    ephemeral: true
                });
                return;
            }

            await interaction.reply({ embeds: [result.embed] });

        } catch (error) {
            console.error('❌ Error fetching quiz stats:', error);
            await interaction.reply({
                content: '❌ Failed to fetch quiz statistics. Please try again later.',
                ephemeral: true
            });
        }
    },

    async executeMessage(message, args) {
        try {
            const result = await CommandUtils.generateStatsEmbed(message.author, null, false);

            if (result.error) {
                await message.reply(`❌ ${result.error}`);
                return;
            }

            await message.reply({ embeds: [result.embed] });

        } catch (error) {
            console.error('❌ Error fetching quiz stats:', error);
            await message.reply('❌ Failed to fetch quiz statistics. Please try again later.');
        }
    }
};