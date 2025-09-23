const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

class CommandHandler {
    constructor() {
        this.commands = new Collection();
        this.commandArray = [];
    }

    loadCommands() {
        const commandsPath = path.join(__dirname, '../commands');

        if (!fs.existsSync(commandsPath)) {
            console.log('❌ Commands directory not found!');
            return;
        }

        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        console.log(`🔄 Loading ${commandFiles.length} commands...`);

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);

            try {
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);

                if ('data' in command && 'execute' in command) {
                    this.commands.set(command.data.name, command);
                    this.commandArray.push(command.data.toJSON());
                    console.log(`✅ Loaded command: ${command.data.name}`);
                } else {
                    console.log(`❌ Command ${file} is missing required "data" or "execute" property.`);
                }
            } catch (error) {
                console.error(`❌ Error loading command ${file}:`, error);
            }
        }

        console.log(`✅ Successfully loaded ${this.commands.size} commands!`);
    }

    async handleSlashCommand(interaction) {
        const command = this.commands.get(interaction.commandName);

        if (!command) {
            console.error(`❌ No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`❌ Error executing command ${interaction.commandName}:`, error);

            const errorMessage = {
                content: '❌ There was an error while executing this command!',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }

    async handleMessageCommand(message) {
        const content = message.content.toLowerCase();

        // Handle different command prefixes
        let commandName, args;

        if (content.startsWith('/')) {
            const parts = message.content.slice(1).split(' ');
            commandName = parts[0].toLowerCase();
            args = parts.slice(1);
        } else if (content.startsWith('!')) {
            const parts = message.content.slice(1).split(' ');
            commandName = parts[0].toLowerCase();
            args = parts.slice(1);
        } else {
            return; // Not a command
        }

        const command = this.commands.get(commandName);

        if (!command || !command.executeMessage) {
            return; // Command not found or doesn't support message execution
        }

        try {
            await command.executeMessage(message, args);
        } catch (error) {
            console.error(`❌ Error executing message command ${commandName}:`, error);
            await message.reply('❌ There was an error while executing this command!');
        }
    }

    getCommandArray() {
        return this.commandArray;
    }

    reloadCommands() {
        this.commands.clear();
        this.commandArray = [];
        this.loadCommands();
    }
}

module.exports = CommandHandler;