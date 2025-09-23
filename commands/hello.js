const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hello')
        .setDescription('A simple hello world command!'),

    async execute(interaction) {
        await interaction.reply({
            content: '👋 Hello World! Welcome to the WorldGuessr Discord Bot!',
            ephemeral: false
        });
    },

    async executeMessage(message, args) {
        await message.reply('👋 Hello World! Welcome to the WorldGuessr Discord Bot!');
    }
};