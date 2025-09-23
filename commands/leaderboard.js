const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const QuizDatabase = require('../database/database');

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
                    { name: 'TLD Quiz', value: 'tld' }
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

        const db = new QuizDatabase();

        try {
            let leaderboard;
            let categoryName;

            if (category === 'overall') {
                leaderboard = db.getOverallLeaderboard(limit);
                categoryName = 'Overall Quiz';
            } else {
                leaderboard = db.getLeaderboard(category, limit);
                categoryName = category === 'tld' ? 'Country TLD' : category.toUpperCase();
            }

            if (!leaderboard || leaderboard.length === 0) {
                await interaction.reply({
                    content: `❌ No quiz data found yet!`,
                    ephemeral: true
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(`🏆 ${categoryName} Leaderboard`)
                .setDescription(`Top ${leaderboard.length} players by correct answers`)
                .setColor('#f1c40f')
                .setFooter({
                    text: 'Quiz Leaderboard • Based on total correct answers',
                    iconURL: 'https://worldguessr.com/favicon.ico'
                })
                .setTimestamp();

            let leaderboardText = '';
            const medals = ['🥇', '🥈', '🥉'];

            for (let i = 0; i < leaderboard.length; i++) {
                const user = leaderboard[i];
                const medal = i < 3 ? medals[i] : `**${i + 1}.**`;

                try {
                    const discordUser = await interaction.client.users.fetch(user.user_id);
                    const displayName = discordUser.displayName || discordUser.username;

                    if (category === 'overall') {
                        leaderboardText += `${medal} **${displayName}**\n`;
                        leaderboardText += `   ✅ ${user.total_correct} correct • ❌ ${user.total_incorrect} wrong • 📈 ${user.accuracy}% accuracy\n`;
                        leaderboardText += `   🎯 ${user.categories_played} categories played\n\n`;
                    } else {
                        leaderboardText += `${medal} **${displayName}**\n`;
                        leaderboardText += `   ✅ ${user.correct} correct • ❌ ${user.incorrect} wrong • 📈 ${user.accuracy}% accuracy\n\n`;
                    }
                } catch (error) {
                    // User not found or can't fetch, show ID instead
                    if (category === 'overall') {
                        leaderboardText += `${medal} **User ${user.user_id}**\n`;
                        leaderboardText += `   ✅ ${user.total_correct} correct • ❌ ${user.total_incorrect} wrong • 📈 ${user.accuracy}% accuracy\n\n`;
                    } else {
                        leaderboardText += `${medal} **User ${user.user_id}**\n`;
                        leaderboardText += `   ✅ ${user.correct} correct • ❌ ${user.incorrect} wrong • 📈 ${user.accuracy}% accuracy\n\n`;
                    }
                }
            }

            embed.setDescription(`${embed.data.description}\n\n${leaderboardText.trim()}`);

            await interaction.reply({ embeds: [embed] });

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
            const db = new QuizDatabase();
            const category = 'tld'; // Default for message command
            const limit = 10;

            const leaderboard = db.getLeaderboard(category, limit);

            if (!leaderboard || leaderboard.length === 0) {
                await message.reply('❌ No quiz data found yet! Start answering some questions first.');
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Country TLD Quiz Leaderboard')
                .setDescription(`Top ${leaderboard.length} players by correct answers`)
                .setColor('#f1c40f')
                .setFooter({
                    text: 'Quiz Leaderboard • Use /leaderboard for more options',
                    iconURL: 'https://worldguessr.com/favicon.ico'
                })
                .setTimestamp();

            let leaderboardText = '';
            const medals = ['🥇', '🥈', '🥉'];

            for (let i = 0; i < Math.min(leaderboard.length, 10); i++) {
                const user = leaderboard[i];
                const medal = i < 3 ? medals[i] : `**${i + 1}.**`;

                try {
                    const discordUser = await message.client.users.fetch(user.user_id);
                    const displayName = discordUser.displayName || discordUser.username;

                    leaderboardText += `${medal} **${displayName}**\n`;
                    leaderboardText += `   ✅ ${user.correct} • ❌ ${user.incorrect} • 📈 ${user.accuracy}%\n\n`;
                } catch (error) {
                    // User not found, skip or show generic
                    leaderboardText += `${medal} **Player**\n`;
                    leaderboardText += `   ✅ ${user.correct} • ❌ ${user.incorrect} • 📈 ${user.accuracy}%\n\n`;
                }
            }

            embed.setDescription(`${embed.data.description}\n\n${leaderboardText.trim()}`);

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ Error fetching leaderboard:', error);
            await message.reply('❌ Failed to fetch leaderboard. Please try again later.');
        }
    }
};