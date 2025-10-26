const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('letsplay')
        .setDescription('Use this command to find others to play Worldguessr with!'),

    async execute(interaction) {
        const gameCode = interaction.options.getInteger('code');
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
        if (userId && Date.now() - date[userId].timestamp < 3600000) {
            await interaction.reply({
                content: 'Please wait ${Math.ceil((3600000 - (Date.now() - data[userId].timestamp)) / 60000)} minutes before using this command again.'
            });
        } else {
            data[userId] = {
                timestamp: Date.now()
            };

            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            await interaction.reply({
                content: '<@${roleId}>, <@${userId}> wants to play at ${gameCode}'
            });
        }
    }
};