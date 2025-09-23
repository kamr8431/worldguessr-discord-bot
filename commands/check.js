const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

async function createStatsEmbed(username, data) {
    return new EmbedBuilder()
        .setTitle(`🌍 WorldGuessr Stats: ${username}`)
        .setColor(data.league.color)
        .setThumbnail('https://worldguessr.com/favicon.ico')
        .addFields(
            {
                name: '🏆 ELO Rating',
                value: `${data.elo}`,
                inline: true
            },
            {
                name: '📊 Global ELO Rank',
                value: `#${data.rank.toLocaleString()}`,
                inline: true
            },
            {
                name: `${data.league.emoji} League`,
                value: data.league.name,
                inline: true
            },
            {
                name: '📈 Win Rate',
                value: `${(data.win_rate * 100).toFixed(1)}%`,
                inline: true
            },
            {
                name: '⚔️ Duel Statistics',
                value: `**Wins:** ${data.duels_wins} | **Losses:** ${data.duels_losses} | **Ties:** ${data.duels_tied}`,
                inline: false
            }
        )
        .setFooter({
            text: 'Data from WorldGuessr API',
            iconURL: 'https://worldguessr.com/favicon.ico'
        })
        .setTimestamp();
}

async function fetchPlayerStats(username) {
    try {
        const response = await axios.get(`https://api.worldguessr.com/api/eloRank?username=${encodeURIComponent(username)}`);
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ Error fetching WorldGuessr data for user: ', username);

        if (error.response && error.response.status === 404) {
            return {
                success: false,
                error: `❌ Player **${username}** not found on WorldGuessr. Check the username spelling or case sensitivity!`
            };
        } else {
            return {
                success: false,
                error: '❌ Failed to fetch player data. The WorldGuessr API might be down or the user doesn\'t exist.'
            };
        }
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check')
        .setDescription('Check WorldGuessr player statistics')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('WorldGuessr username to check')
                .setRequired(true)),

    async execute(interaction) {
        const username = interaction.options.getString('username');

        await interaction.deferReply();

        const result = await fetchPlayerStats(username);

        if (result.success) {
            const embed = await createStatsEmbed(username, result.data);
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.editReply({ content: result.error });
        }
    },

    async executeMessage(message, args) {
        if (args.length === 0) {
            await message.reply('❌ Please provide a username! Usage: `/check <username>` or `!check <username>`');
            return;
        }

        const username = args.join(' ').trim();

        await message.channel.sendTyping();

        const result = await fetchPlayerStats(username);

        if (result.success) {
            const embed = await createStatsEmbed(username, result.data);
            await message.reply({ embeds: [embed] });
        } else {
            await message.reply(result.error);
        }
    }
};