const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const QuizDatabase = require('../database/database');
const GenericUtils = require('../utils/genericUtils');
const CommandHandler = require('../utils/commandHandler');

// Core stats logic - completely agnostic to command type
async function statsLogic({ targetUser, category, isSlash }) {
    const db = new QuizDatabase();

    if (category) {
        // Single category stats
        const stats = db.getUserStats(targetUser.id, category);

        if (!stats || stats.total_attempts === 0) {
            return {
                error: `${targetUser.displayName} hasn't attempted any ${GenericUtils.getCategoryDisplayName(category)} quizzes yet!`
            };
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

        return { embed };
    }
}

// Parameter configuration for the command
const paramConfig = {
    targetUser: {
        type: 'user',
        default: null, // Will be set to interaction.user or message.author
        messageDefault: null
    },
    category: {
        type: 'string',
        default: null,
        messageDefault: null
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View your quiz statistics')
        .addUserOption(option =>
            option.setName('targetUser')
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
        const params = CommandHandler.extractSlashParams(interaction, paramConfig);
        params.targetUser = params.targetUser || interaction.user;

        await CommandHandler.handleCommand(statsLogic, params);
    },

    async executeMessage(message, args) {
        const params = CommandHandler.extractMessageParams(message, args, paramConfig);
        params.targetUser = message.author;

        await CommandHandler.handleCommand(statsLogic, params);
    }
};