require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, Routes, REST, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const commands = [
    new SlashCommandBuilder()
        .setName('hello')
        .setDescription('A simple hello world command!')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('check')
        .setDescription('Check WorldGuessr player statistics')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('WorldGuessr username to check')
                .setRequired(true))
        .toJSON()
];

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);

    // Set bot status
    client.user.setPresence({
        activities: [{ name: 'WorldGuessr', type: 0 }], // 0 = Playing
        status: 'online'
    });

    console.log(`🟢 Bot status set to: ${client.user.presence.status}`);

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('🔄 Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'hello') {
        await interaction.reply({
            content: '👋 Hello World! Welcome to the WorldGuessr Discord Bot!',
            ephemeral: false
        });
    }

    if (interaction.commandName === 'check') {
        const username = interaction.options.getString('username');

        try {
            await interaction.deferReply();

            const response = await axios.get(`https://api.worldguessr.com/api/eloRank?username=${encodeURIComponent(username)}`);
            const data = response.data;

            const embed = new EmbedBuilder()
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
                        name: '⚔️ Duel Statistics',
                        value: `**Wins:** ${data.duels_wins}\n**Losses:** ${data.duels_losses}\n**Ties:** ${data.duels_tied}`,
                        inline: true
                    },
                    {
                        name: '📈 Win Rate',
                        value: `${(data.win_rate * 100).toFixed(1)}%`,
                        inline: true
                    },
                    {
                        name: '🎯 League Range',
                        value: `${data.league.min} - ${data.league.max} ELO`,
                        inline: true
                    }
                )
                .setFooter({
                    text: 'Data from WorldGuessr API',
                    iconURL: 'https://worldguessr.com/favicon.ico'
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ Error fetching WorldGuessr data:', error);

            if (error.response && error.response.status === 404) {
                await interaction.editReply({
                    content: `❌ Player **${username}** not found on WorldGuessr. Check the username spelling!`
                });
            } else {
                await interaction.editReply({
                    content: '❌ Failed to fetch player data. The WorldGuessr API might be down or the user doesn\'t exist.'
                });
            }
        }
    }
});

client.on('messageCreate', (message) => {
    // Don't log bot messages
    if (message.author.bot) return;

    console.log(`📝 [${message.guild?.name || 'DM'}] ${message.author.tag}: ${message.content}`);
});

client.on('error', (error) => {
    console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled promise rejection:', error);
});

client.login(process.env.DISCORD_TOKEN);