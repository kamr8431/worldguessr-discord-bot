const { SlashCommandBuilder } = require('discord.js');
const CommandUtils = require('../utils/commandUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the quiz leaderboard')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Show leaderboard for specific category')
                .setRequired(false)
                .addChoices(
                    { name: 'Overall (All Categories)', value: 'overall' },
                    { name: 'TLD Quiz', value: 'tld' },
                    { name: 'Flags Quiz', value: 'flags' }
                ))
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of users to show (default: 10)')
                .setRequired(false)
                .setMinValue(5)
                .setMaxValue(25)),

    async execute(interaction) {
        const category = interaction.options.getString('category') || 'overall';
        const limit = interaction.options.getInteger('limit') || 10;

        try {
            const result = await CommandUtils.generateLeaderboardEmbed(interaction.client, category, limit, true);

            if (result.error) {
                await interaction.reply({
                    content: `❌ ${result.error}`,
                    ephemeral: true
                });
                return;
            }

            await interaction.reply({ embeds: [result.embed] });

        } catch (error) {
            console.error('❌ Error fetching leaderboard:', error);
            await interaction.reply({
                content: '❌ Failed to fetch leaderboard. Please try again later.',
                ephemeral: true
            });
        }
    },

    async executeMessage(message, args) {
        try {
            const result = await CommandUtils.generateLeaderboardEmbed(message.client, 'tld', 10, false);

            if (result.error) {
                await message.reply(`❌ ${result.error}`);
                return;
            }

            await message.reply({ embeds: [result.embed] });

        } catch (error) {
            console.error('❌ Error fetching leaderboard:', error);
            await message.reply('❌ Failed to fetch leaderboard. Please try again later.');
        }
    }
};