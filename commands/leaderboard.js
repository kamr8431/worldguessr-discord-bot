const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const QuizDatabase = require('../database/database');
const GenericUtils = require('../utils/genericUtils');

// Internal shared function for building leaderboard embed
async function buildLeaderboardEmbed(client, category, limit, isSlash = true) {
    const db = new QuizDatabase();

    let leaderboard;
    let categoryName;

    if (category === 'overall') {
        leaderboard = db.getOverallLeaderboard(limit);
        categoryName = 'Overall Quiz';
    } else {
        leaderboard = db.getLeaderboard(category, limit);
        categoryName = GenericUtils.getCategoryDisplayName(category);
    }

    if (!leaderboard || leaderboard.length === 0) {
        return { error: 'No quiz data found yet!' };
    }

    const embed = new EmbedBuilder()
        .setTitle(`🏆 ${categoryName} Leaderboard`)
        .setDescription(`Top ${leaderboard.length} players by correct answers`)
        .setColor('#f1c40f')
        .setFooter({
            text: isSlash ? 'Quiz Leaderboard • Based on total correct answers' : 'Quiz Leaderboard • Use /leaderboard for more options',
            iconURL: 'https://worldguessr.com/favicon.ico'
        })
        .setTimestamp();

    let leaderboardText = '';

    for (let i = 0; i < leaderboard.length; i++) {
        const user = leaderboard[i];
        const medal = GenericUtils.getRankMedal(i);
        const displayName = await GenericUtils.fetchUserSafely(client, user.user_id);

        if (category === 'overall') {
            leaderboardText += `${medal} **${displayName}**\n`;
            leaderboardText += `   ✅ ${user.total_correct} correct • ❌ ${user.total_incorrect} wrong • 📈 ${user.accuracy}% accuracy\n\n`;
        } else {
            leaderboardText += `${medal} **${displayName}**\n`;
            if (isSlash) {
                leaderboardText += `   ✅ ${user.correct} correct • ❌ ${user.incorrect} wrong • 📈 ${user.accuracy}% accuracy\n\n`;
            } else {
                leaderboardText += `   ✅ ${user.correct} • ❌ ${user.incorrect} • 📈 ${user.accuracy}%\n\n`;
            }
        }
    }

    embed.setDescription(`${embed.data.description}\n\n${leaderboardText.trim()}`);
    return { embed };
}

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
            const result = await buildLeaderboardEmbed(interaction.client, category, limit, true);

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
            const result = await buildLeaderboardEmbed(message.client, 'overall', 10, false);

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