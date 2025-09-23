# Commands Directory

This directory contains all bot commands. Each command is automatically detected and loaded by the command handler.

## Creating a New Command

To add a new command, simply create a new `.js` file in this directory with the following structure:

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    // Slash command definition
    data: new SlashCommandBuilder()
        .setName('commandname')
        .setDescription('Your command description')
        .addStringOption(option =>
            option.setName('parameter')
                .setDescription('Parameter description')
                .setRequired(true)),

    // Handle slash command execution
    async execute(interaction) {
        // Your slash command logic here
        await interaction.reply('Response!');
    },

    // Handle text-based command execution (optional)
    async executeMessage(message, args) {
        // Your text command logic here
        // args = array of arguments after the command name
        await message.reply('Response!');
    }
};
```

## Command Features

- **Auto-detection**: Just create a file, restart the bot - command is loaded automatically
- **Multiple prefixes**: Commands work with both `/` and `!` prefixes in messages
- **Slash command support**: Full Discord slash command integration
- **Error handling**: Robust error handling for both slash and text commands
- **Hot reload**: Commands can be reloaded without restarting the bot (development mode)

## Examples

- `/hello` or `!hello` - Simple greeting command
- `/check username` or `!check username` - Check WorldGuessr player stats

## File Requirements

- File must export an object with `data` and `execute` properties
- `executeMessage` is optional for text-based command support
- `data` must be a SlashCommandBuilder instance
- Files must have `.js` extension