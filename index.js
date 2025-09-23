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