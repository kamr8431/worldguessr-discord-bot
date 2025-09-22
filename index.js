require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, Routes, REST } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

const commands = [
    new SlashCommandBuilder()
        .setName('hello')
        .setDescription('A simple hello world command!')
        .toJSON()
];

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);

    // Set bot status
    client.user.setPresence({
        activities: [{ name: 'WorldGuessr', type: 0 }], // 0 = Playing
        status: 'online'
    });

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
});

client.on('error', (error) => {
    console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled promise rejection:', error);
});

client.login(process.env.DISCORD_TOKEN);