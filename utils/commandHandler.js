// Generic command handler that abstracts slash vs message command differences
class CommandHandler {
    // Handle both slash and message commands with unified logic
    static async handleCommand(commandLogic, context) {
        const { isSlash, interaction, message, ...params } = context;

        try {
            const result = await commandLogic(params);

            if (result.error) {
                if (isSlash) {
                    await interaction.reply({
                        content: `❌ ${result.error}`,
                        ephemeral: true
                    });
                } else {
                    await message.reply(`❌ ${result.error}`);
                }
                return;
            }

            // Send the result
            if (isSlash) {
                await interaction.reply({ embeds: [result.embed] });
            } else {
                await message.reply({ embeds: [result.embed] });
            }

        } catch (error) {
            const errorMsg = `❌ Failed to execute command. Please try again later.`;
            console.error(`❌ Command error:`, error);

            if (isSlash) {
                await interaction.reply({
                    content: errorMsg,
                    ephemeral: true
                });
            } else {
                await message.reply(errorMsg);
            }
        }
    }

    // Extract parameters from slash command interaction
    static extractSlashParams(interaction, paramConfig) {
        const params = {
            isSlash: true,
            interaction,
            client: interaction.client
        };

        for (const [key, config] of Object.entries(paramConfig)) {
            if (config.type === 'user') {
                params[key] = interaction.options.getUser(key) || config.default;
            } else if (config.type === 'string') {
                params[key] = interaction.options.getString(key) || config.default;
            } else if (config.type === 'integer') {
                params[key] = interaction.options.getInteger(key) || config.default;
            }
        }

        return params;
    }

    // Extract parameters from message command
    static extractMessageParams(message, args, paramConfig) {
        const params = {
            isSlash: false,
            message,
            client: message.client
        };

        // For message commands, use defaults since we don't parse args
        for (const [key, config] of Object.entries(paramConfig)) {
            params[key] = config.messageDefault || config.default;
        }

        return params;
    }
}

module.exports = CommandHandler;