require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const CommandHandler = require('./handlers/commandHandler');
const QuizManager = require('./quiz/quizManager');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const commandHandler = new CommandHandler();
const quizManager = new QuizManager();

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);

    // Set bot status
    client.user.setPresence({
        activities: [{ name: 'WorldGuessr', type: 0 }], // 0 = Playing
        status: 'online'
    });

    console.log(`🟢 Bot status set to: ${client.user.presence.status}`);

    // Load commands
    commandHandler.loadCommands();

    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('🔄 Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commandHandler.getCommandArray() }
        );

        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }

    // Initialize quiz system
    await quizManager.initializeQuizChannels(client);
});

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    await commandHandler.handleSlashCommand(interaction);
});

// Handle message commands
client.on('messageCreate', async (message) => {
    // Don't respond to bot messages
    if (message.author.bot) return;

    // Log all messages
    console.log(`📝 [${message.guild?.name || 'DM'}] ${message.author.tag}: ${message.content}`);

    // Check if this is a quiz channel and handle quiz answers
    if (quizManager.isQuizChannel(message.channel.id)) {
        const activeQuiz = quizManager.activeQuizzes.get(message.channel.id);

        if (activeQuiz && !message.content.startsWith('/') && !message.content.startsWith('!')) {
            // This is a potential quiz answer
            await quizManager.handleQuizAnswer(message, activeQuiz);
            return; // Don't process as a command
        }
    }

    // Handle commands (both / and ! prefixes)
    await commandHandler.handleMessageCommand(message);
});

// Handle forum thread creation - automatic stats check
client.on('threadCreate', async (thread) => {
    // Check if this is the report-user forum channel
    if (thread.parentId === '1308448612833034240') {
        try {
            // Get the username from the thread name
            const username = thread.name;
            console.log(`📊 New report thread created for: ${username}`);

            // Try to get WorldGuessr stats using the username from thread title
            try {
                const axios = require('axios');
                const response = await axios.get(`https://api.worldguessr.com/api/eloRank?username=${encodeURIComponent(username)}`);

                if (response.data && !response.data.message) {
                    const { EmbedBuilder } = require('discord.js');
                    const data = response.data;

                    const worldGuessrEmbed = new EmbedBuilder()
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
                            text: 'WorldGuessr API Data',
                            iconURL: 'https://worldguessr.com/favicon.ico'
                        })
                        .setTimestamp();

                    await thread.send({ embeds: [worldGuessrEmbed] });
                    console.log(`🌍 Posted WorldGuessr stats for ${username} in report thread`);
                } else {
                    // No WorldGuessr account found
                    await thread.send(`📊 **Stats Check for "${username}"**\nNo WorldGuessr account found with this username.`);
                    console.log(`📊 No WorldGuessr stats found for ${username}`);
                }
            } catch (apiError) {
                await thread.send(`📊 **Stats Check for "${username}"**\nNo WorldGuessr account found or API error occurred.`);
                console.log(`🌍 No WorldGuessr stats found for ${username} (API error or user doesn't exist)`);
            }

        } catch (error) {
            console.error('❌ Error handling thread creation:', error);
            await thread.send('📊 **Stats Check:** Error retrieving user statistics.').catch(() => {});
        }
    }
});

client.on('error', (error) => {
    console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled promise rejection:', error);
});

// Hot reload commands in development
if (process.env.NODE_ENV === 'development') {
    process.on('SIGUSR2', () => {
        console.log('🔄 Reloading commands...');
        commandHandler.reloadCommands();
    });
}

client.login(process.env.DISCORD_TOKEN);