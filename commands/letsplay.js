const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('letsplay')
        .setDescription('Use this command to find others to play Worldguessr with!')
        .addIntegerOption(o =>
            o.setName('code')
              .setDescription('Enter your Worldguessr game code')
              .setRequired(true)
          ),

    async execute(interaction) {
        const gameCode = interaction.options.getInteger('game code',true);
        const userId = interaction.user.id;
        const roleId = 1421434087343657093;
        const filePath = path.join(__dirname, '..', 'letsplaypings.json');
        let data = {};
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            data = JSON.parse(fileContent);
        } catch (err) {
            console.log('Error reading letsplaypings.json');
            data = {};
        }
        if (userId in data && Date.now() - data[userId].timestamp < 3600000) {
            await interaction.reply({
                content: `Please wait ${Math.ceil((3600000 - (Date.now() - data[userId].timestamp)) / 60000)} minutes before using this command again.`
            });
        } else {
            data[userId] = {
                timestamp: Date.now()
            };

            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            await interaction.reply({
                content: `<@&${roleId}>, <@${userId}> wants to play at ${gameCode}`
            });
        }
    }
};