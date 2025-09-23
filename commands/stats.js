const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const QuizDatabase = require('../database/database');
const GenericUtils = require('../utils/genericUtils');

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
        const db = new QuizDatabase();

        try {
            if (category) {
                // Show specific category stats
                const stats = db.getUserStats(targetUser.id, category);

                if (!stats || stats.total_attempts === 0) {
                    await interaction.reply({
                        content: `❌ ${targetUser.displayName} hasn't attempted any ${GenericUtils.getCategoryDisplayName(category)} quizzes yet!`,
                        ephemeral: true
                    });
                    return;
                }

                const accuracy = GenericUtils.formatAccuracy(stats.correct, stats.total_attempts);
                const categoryName = GenericUtils.getCategoryDisplayName(category);

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
                            value: GenericUtils.formatDate(stats.last_attempt),
                            inline: true
                        }
                    )
                    .setFooter({
                        text: 'Quiz Statistics',
                        iconURL: 'https://worldguessr.com/favicon.ico'
                    })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });

            } else {
                // Show all category stats
                const allStats = db.getUserStats(targetUser.id);

                if (!allStats || allStats.length === 0) {
                    await interaction.reply({
                        content: `❌ ${targetUser.displayName} hasn't attempted any quizzes yet!`,
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle('📊 Quiz Statistics Overview')
                    .setDescription(`All quiz stats for ${targetUser.displayName}`)
                    .setColor('#3498db')
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setFooter({
                        text: 'Quiz Statistics • Use /stats category:tld for detailed stats',
                        iconURL: 'https://worldguessr.com/favicon.ico'
                    })
                    .setTimestamp();

                let totalCorrect = 0;
                let totalIncorrect = 0;
                let totalAttempts = 0;

                allStats.forEach(stat => {
                    const accuracy = GenericUtils.formatAccuracy(stat.correct, stat.total_attempts);
                    const categoryName = GenericUtils.getCategoryDisplayName(stat.category);

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
                    const overallAccuracy = GenericUtils.formatAccuracy(totalCorrect, totalAttempts);
                    embed.addFields({
                        name: '📈 Overall Statistics',
                        value: `**Total Correct:** ${totalCorrect}\n**Total Wrong:** ${totalIncorrected}\n**Overall Accuracy:** ${overallAccuracy}%\n**Total Attempts:** ${totalAttempts}`,
                        inline: false
                    });
                }

                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('❌ Error fetching quiz stats:', error);
            await interaction.reply({
                content: '❌ Failed to fetch quiz statistics. Please try again later.',
                ephemeral: true
            });
        }
    },

    async executeMessage(message, args) {
        const db = new QuizDatabase();

        try {
            const allStats = db.getUserStats(message.author.id);

            if (!allStats || allStats.length === 0) {
                await message.reply('❌ You haven\'t attempted any quizzes yet! Try answering some questions in the quiz channels.');
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('📊 Your Quiz Statistics')
                .setDescription(`Quiz stats for ${message.author.displayName}`)
                .setColor('#3498db')
                .setThumbnail(message.author.displayAvatarURL())
                .setFooter({
                    text: 'Quiz Statistics • Use /stats for more detailed options',
                    iconURL: 'https://worldguessr.com/favicon.ico'
                })
                .setTimestamp();

            let totalCorrect = 0;
            let totalIncorrect = 0;
            let totalAttempts = 0;

            allStats.forEach(stat => {
                const accuracy = GenericUtils.formatAccuracy(stat.correct, stat.total_attempts);
                const categoryName = GenericUtils.getCategoryDisplayName(stat.category);

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
                const overallAccuracy = GenericUtils.formatAccuracy(totalCorrect, totalAttempts);
                embed.addFields({
                    name: '📈 Overall Statistics',
                    value: `**Total Correct:** ${totalCorrect}\n**Total Wrong:** ${totalIncorrect}\n**Overall Accuracy:** ${overallAccuracy}%\n**Total Attempts:** ${totalAttempts}`,
                    inline: false
                });
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ Error fetching quiz stats:', error);
            await message.reply('❌ Failed to fetch quiz statistics. Please try again later.');
        }
    }
};