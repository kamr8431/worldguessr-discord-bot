const { EmbedBuilder } = require('discord.js');
const QuizDatabase = require('../database/database');

class CommandUtils {
    static getCategoryDisplayName(category) {
        switch(category) {
            case 'tld': return 'Country TLD';
            case 'flags': return 'Country Flags';
            default: return category.toUpperCase();
        }
    }

    static async generateStatsEmbed(targetUser, category = null, isSlash = true) {
        const db = new QuizDatabase();

        if (category) {
            // Single category stats
            const stats = db.getUserStats(targetUser.id, category);

            if (!stats || stats.total_attempts === 0) {
                return {
                    error: `${targetUser.displayName} hasn't attempted any ${this.getCategoryDisplayName(category)} quizzes yet!`
                };
            }

            const accuracy = ((stats.correct / stats.total_attempts) * 100).toFixed(1);
            const categoryName = this.getCategoryDisplayName(category);

            const embed = new EmbedBuilder()
                .setTitle(`📊 ${categoryName} Quiz Stats`)
                .setDescription(`Statistics for ${targetUser.displayName}`)
                .setColor('#3498db')
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    {
                        name: '✅ Correct Answers',
                        value: `${stats.correct}`,
                        inline: true
                    },
                    {
                        name: '❌ Incorrect Answers',
                        value: `${stats.incorrect}`,
                        inline: true
                    },
                    {
                        name: '📈 Accuracy',
                        value: `${accuracy}%`,
                        inline: true
                    },
                    {
                        name: '🎯 Total Attempts',
                        value: `${stats.total_attempts}`,
                        inline: true
                    },
                    {
                        name: '⏰ Last Attempt',
                        value: new Date(stats.last_attempt).toLocaleDateString(),
                        inline: true
                    }
                )
                .setFooter({
                    text: 'Quiz Statistics',
                    iconURL: 'https://worldguessr.com/favicon.ico'
                })
                .setTimestamp();

            return { embed };
        } else {
            // All categories stats
            const allStats = db.getUserStats(targetUser.id);

            if (!allStats || allStats.length === 0) {
                return {
                    error: `${targetUser.displayName} hasn't attempted any quizzes yet!`
                };
            }

            const embed = new EmbedBuilder()
                .setTitle('📊 Quiz Statistics Overview')
                .setDescription(`All quiz stats for ${targetUser.displayName}`)
                .setColor('#3498db')
                .setThumbnail(targetUser.displayAvatarURL())
                .setFooter({
                    text: isSlash ? 'Quiz Statistics • Use /stats category:tld for detailed stats' : 'Quiz Statistics • Use /stats for more detailed options',
                    iconURL: 'https://worldguessr.com/favicon.ico'
                })
                .setTimestamp();

            let totalCorrect = 0;
            let totalIncorrect = 0;
            let totalAttempts = 0;

            allStats.forEach(stat => {
                const accuracy = ((stat.correct / stat.total_attempts) * 100).toFixed(1);
                const categoryName = this.getCategoryDisplayName(stat.category);

                embed.addFields({
                    name: `🌍 ${categoryName} Quiz`,
                    value: `**Correct:** ${stat.correct} | **Wrong:** ${stat.incorrect}\n**Accuracy:** ${accuracy}% | **Total:** ${stat.total_attempts}`,
                    inline: false
                });

                totalCorrect += stat.correct;
                totalIncorrect += stat.incorrect;
                totalAttempts += stat.total_attempts;
            });

            if (allStats.length > 1) {
                const overallAccuracy = ((totalCorrect / totalAttempts) * 100).toFixed(1);
                embed.addFields({
                    name: '📈 Overall Statistics',
                    value: `**Total Correct:** ${totalCorrect}\n**Total Wrong:** ${totalIncorrect}\n**Overall Accuracy:** ${overallAccuracy}%\n**Total Attempts:** ${totalAttempts}`,
                    inline: false
                });
            }

            return { embed };
        }
    }

    static async generateLeaderboardEmbed(client, category = 'overall', limit = 10, isSlash = true) {
        const db = new QuizDatabase();

        let leaderboard;
        let categoryName;

        if (category === 'overall') {
            leaderboard = db.getOverallLeaderboard(limit);
            categoryName = 'Overall Quiz';
        } else {
            leaderboard = db.getLeaderboard(category, limit);
            categoryName = this.getCategoryDisplayName(category);
        }

        if (!leaderboard || leaderboard.length === 0) {
            return {
                error: 'No quiz data found yet!'
            };
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
        const medals = ['🥇', '🥈', '🥉'];

        for (let i = 0; i < leaderboard.length; i++) {
            const user = leaderboard[i];
            const medal = i < 3 ? medals[i] : `**${i + 1}.**`;

            try {
                const discordUser = await client.users.fetch(user.user_id);
                const displayName = discordUser.displayName || discordUser.username;

                if (category === 'overall') {
                    leaderboardText += `${medal} **${displayName}**\n`;
                    leaderboardText += `   ✅ ${user.total_correct} correct • ❌ ${user.total_incorrect} wrong • 📈 ${user.accuracy}% accuracy\n\n`;
                } else {
                    const format = isSlash ? 'correct • ❌' : '• ❌';
                    const accuracyFormat = isSlash ? '% accuracy' : '%';

                    leaderboardText += `${medal} **${displayName}**\n`;
                    if (isSlash) {
                        leaderboardText += `   ✅ ${user.correct} correct • ❌ ${user.incorrect} wrong • 📈 ${user.accuracy}% accuracy\n\n`;
                    } else {
                        leaderboardText += `   ✅ ${user.correct} • ❌ ${user.incorrect} • 📈 ${user.accuracy}%\n\n`;
                    }
                }
            } catch (error) {
                // User not found or can't fetch, show ID instead
                if (category === 'overall') {
                    leaderboardText += `${medal} **User ${user.user_id}**\n`;
                    leaderboardText += `   ✅ ${user.total_correct} correct • ❌ ${user.total_incorrect} wrong • 📈 ${user.accuracy}% accuracy\n\n`;
                } else {
                    leaderboardText += `${medal} **User ${user.user_id}**\n`;
                    if (isSlash) {
                        leaderboardText += `   ✅ ${user.correct} correct • ❌ ${user.incorrect} wrong • 📈 ${user.accuracy}% accuracy\n\n`;
                    } else {
                        leaderboardText += `   ✅ ${user.correct} • ❌ ${user.incorrect} • 📈 ${user.accuracy}%\n\n`;
                    }
                }
            }
        }

        embed.setDescription(`${embed.data.description}\n\n${leaderboardText.trim()}`);
        return { embed };
    }
}

module.exports = CommandUtils;