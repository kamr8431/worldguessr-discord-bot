const { EmbedBuilder } = require('discord.js');
const QuizDatabase = require('../database/database');
const countryTlds = require('../country_tlds.json');
const countryFlags = require('../country_flags.json');

class QuizManager {
    constructor() {
        this.db = new QuizDatabase();
        this.tldData = this.prepareTldData();
        this.flagsData = this.prepareFlagsData();
        this.quizChannels = new Set();
        this.autoTimers = new Map();
        this.wrongAttempts = new Map(); // Track wrong attempts per channel
        this.activeQuizzes = new Map(); // Store active quiz data in memory

        // Add quiz channels
        this.quizChannels.add('1419838438349344829'); // TLD quiz
        this.quizChannels.add('1420033591458398258'); // Flags quiz
    }

    prepareTldData() {
        // Convert the JSON to a format where we can quiz both ways
        const tldToCountry = {};
        const countryToTld = {};

        for (const [country, tld] of Object.entries(countryTlds)) {
            tldToCountry[tld] = country;
            countryToTld[country.toLowerCase()] = tld;
        }

        return { tldToCountry, countryToTld, allTlds: Object.values(countryTlds) };
    }

    prepareFlagsData() {
        // Convert the JSON to a format for flag quizzing
        const flagToCountry = {};
        const countryToFlag = {};

        for (const [country, flag] of Object.entries(countryFlags)) {
            flagToCountry[flag] = country;
            countryToFlag[country.toLowerCase()] = flag;
        }

        return { flagToCountry, countryToFlag, allFlags: Object.values(countryFlags), allCountries: Object.keys(countryFlags) };
    }

    getRandomTld() {
        const tlds = this.tldData.allTlds;
        const randomTld = tlds[Math.floor(Math.random() * tlds.length)];
        const country = this.tldData.tldToCountry[randomTld];
        return { tld: randomTld, country };
    }

    getRandomFlag() {
        const countries = this.flagsData.allCountries;
        const randomCountry = countries[Math.floor(Math.random() * countries.length)];
        const flag = this.flagsData.countryToFlag[randomCountry.toLowerCase()];
        return { flag, country: randomCountry };
    }

    getRandomCountryOptions(correctCountry, count = 5, useFlags = false) {
        // Use flags data for country options if it's a flags quiz
        const allCountries = useFlags ? this.flagsData.allCountries : Object.keys(countryTlds);
        const options = [correctCountry];

        // Add random wrong answers
        while (options.length < count) {
            const randomCountry = allCountries[Math.floor(Math.random() * allCountries.length)];
            if (!options.includes(randomCountry)) {
                options.push(randomCountry);
            }
        }

        // Shuffle the options
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }

        return options;
    }

    createQuizEmbed(quizType, quizData, correctCountry, showOptions = false, questionNumber = null) {
        let embed;
        const isFlags = quizType === 'flags';

        if (showOptions) {
            const options = this.getRandomCountryOptions(correctCountry, 5, isFlags);

            const optionsText = options.map((country, index) => {
                const letters = ['A', 'B', 'C', 'D', 'E'];
                return `${letters[index]}) ${country}`;
            }).join('\n');

            if (isFlags) {
                embed = new EmbedBuilder()
                    .setTitle('🏳️ Country Flag Quiz')
                    .setDescription(`**Which country has this flag: ${quizData}?**\n\n${optionsText}\n\n*Type the country name or letter (A, B, C, D, E) to answer!*`)
                    .setColor('#e67e22') // Orange color for hint mode
                    .setFooter({
                        text: 'Quiz System • Multiple choice hint mode',
                        iconURL: 'https://worldguessr.com/favicon.ico'
                    })
                    .setTimestamp();
            } else {
                embed = new EmbedBuilder()
                    .setTitle('🌍 Country TLD Quiz')
                    .setDescription(`**Which country uses the TLD: \`${quizData}\`?**\n\n${optionsText}\n\n*Type the country name or letter (A, B, C, D, E) to answer!*`)
                    .setColor('#e67e22') // Orange color for hint mode
                    .setFooter({
                        text: 'Quiz System • Multiple choice hint mode',
                        iconURL: 'https://worldguessr.com/favicon.ico'
                    })
                    .setTimestamp();
            }

            // Store the options for later reference
            embed.quizOptions = options;
        } else {
            if (isFlags) {
                embed = new EmbedBuilder()
                    .setTitle('🏳️ Country Flag Quiz')
                    .setDescription(`**Which country has this flag: ${quizData}?**\n\n*Type the country name to answer!*`)
                    .setColor('#3498db')
                    .setFooter({
                        text: 'Quiz System • Type the country name',
                        iconURL: 'https://worldguessr.com/favicon.ico'
                    })
                    .setTimestamp();
            } else {
                embed = new EmbedBuilder()
                    .setTitle('🌍 Country TLD Quiz')
                    .setDescription(`**Which country uses the TLD: \`${quizData}\`?**\n\n*Type the country name to answer!*`)
                    .setColor('#3498db')
                    .setFooter({
                        text: 'Quiz System • Type the country name',
                        iconURL: 'https://worldguessr.com/favicon.ico'
                    })
                    .setTimestamp();
            }
        }

        if (questionNumber) {
            const title = isFlags ? `🏳️ Country Flag Quiz #${questionNumber}` : `🌍 Country TLD Quiz #${questionNumber}`;
            embed.setTitle(title);
        }

        return embed;
    }

    createCorrectAnswerEmbed(quizType, quizData, country, userName, streak = null) {
        const isFlags = quizType === 'flags';

        let description;
        if (isFlags) {
            description = `**${country}** has the flag ${quizData}\n\n🎉 Well done, ${userName}!`;
        } else {
            description = `**${country}** uses \`${quizData}\`\n\n🎉 Well done, ${userName}!`;
        }

        const embed = new EmbedBuilder()
            .setTitle('✅ Correct!')
            .setDescription(description)
            .setColor('#27ae60')
            .setFooter({
                text: 'Next question coming up...',
                iconURL: 'https://worldguessr.com/favicon.ico'
            })
            .setTimestamp();

        if (streak && streak > 1) {
            embed.addFields({
                name: '🔥 Streak',
                value: `${streak} in a row!`,
                inline: true
            });
        }

        return embed;
    }

    createIncorrectAnswerEmbed(quizType, quizData, correctCountry, userAnswer, userName) {
        const isFlags = quizType === 'flags';

        let description;
        if (isFlags) {
            description = `**${correctCountry}** has the flag ${quizData}\n\nYou answered: **${userAnswer}**`;
        } else {
            description = `**${correctCountry}** uses \`${quizData}\`\n\nYou answered: **${userAnswer}**`;
        }

        const embed = new EmbedBuilder()
            .setTitle('❌ Incorrect!')
            .setDescription(description)
            .setColor('#e74c3c')
            .setFooter({
                text: 'Better luck next time! Next question coming up...',
                iconURL: 'https://worldguessr.com/favicon.ico'
            })
            .setTimestamp();

        return embed;
    }

    async postNewQuestion(channel) {
        try {
            // Determine quiz type based on channel ID
            const isFlags = channel.id === '1420033591458398258';
            const quizType = isFlags ? 'flags' : 'tld';

            let quizData, country, options;

            if (isFlags) {
                const flagQuiz = this.getRandomFlag();
                quizData = flagQuiz.flag;
                country = flagQuiz.country;
                options = this.getRandomCountryOptions(country, 5, true);
            } else {
                const tldQuiz = this.getRandomTld();
                quizData = tldQuiz.tld;
                country = tldQuiz.country;
                options = this.getRandomCountryOptions(country, 5, false);
            }

            // Store the active quiz in memory
            this.activeQuizzes.set(channel.id, {
                quizType,
                quizData,
                country,
                options,
                showingOptions: false
            });

            // Reset wrong attempts for new question
            this.wrongAttempts.set(channel.id, 0);

            console.log(`🔄 New question posted for ${channel.id}: ${quizData} -> ${country}, wrong attempts reset to 0`);

            const embed = this.createQuizEmbed(quizType, quizData, country, false);
            await channel.send({ embeds: [embed] });

            console.log(`📝 Posted ${quizType} quiz: ${quizData} -> ${country} in ${channel.name}`);

            return true;
        } catch (error) {
            console.error('❌ Error posting quiz question:', error);
            return false;
        }
    }


    normalizeCountryName(input) {
        return input.toLowerCase()
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/^the\s+/, '') // Remove "the" prefix
            .replace(/\s+and\s+/g, ' and ') // Normalize "and"
            .replace(/\s+of\s+/g, ' of ') // Normalize "of"
            .replace(/['']/g, "'") // Normalize apostrophes
            .replace(/[^\w\s'-]/g, ''); // Remove special chars except apostrophes and hyphens
    }

    isCorrectAnswer(userAnswer, correctCountry) {
        const normalizedUser = this.normalizeCountryName(userAnswer);
        const normalizedCorrect = this.normalizeCountryName(correctCountry);

        // Direct match
        if (normalizedUser === normalizedCorrect) return true;

        // Common alternative names
        const alternatives = {
            'united states': ['usa', 'america', 'us'],
            'united kingdom': ['uk', 'britain', 'great britain', 'england'],
            'russia': ['russian federation'],
            'south korea': ['korea', 'republic of korea'],
            'north korea': ['democratic peoples republic of korea'],
            'czechia': ['czech republic'],
            'north macedonia': ['macedonia'],
            'democratic republic of the congo': ['drc', 'congo drc', 'dr congo'],
            'republic of the congo': ['congo', 'congo republic'],
            'cote divoire': ['ivory coast'],
            'myanmar': ['burma'],
            'eswatini': ['swaziland'],
            'cape verde': ['cabo verde'],
            'east timor': ['timor-leste'],
            'vatican city': ['vatican', 'holy see']
        };

        // Check if user answer matches any alternative
        for (const [official, alts] of Object.entries(alternatives)) {
            if (normalizedCorrect === official && alts.includes(normalizedUser)) {
                return true;
            }
            if (alts.includes(normalizedCorrect) && normalizedUser === official) {
                return true;
            }
        }

        // Partial matches for long names
        if (normalizedCorrect.includes(' ') && normalizedUser.length > 3) {
            const correctWords = normalizedCorrect.split(' ');
            const userWords = normalizedUser.split(' ');

            // Check if user provided a significant part of the name
            if (correctWords.some(word => word.length > 3 && userWords.includes(word))) {
                return true;
            }
        }

        return false;
    }

    async handleQuizAnswer(message, activeQuiz) {
        const userAnswer = message.content.trim();
        const correctCountry = activeQuiz.country;
        const quizType = activeQuiz.quizType;
        const quizData = activeQuiz.quizData;

        // Check if answer is a letter (A, B, C, D, E) - only if options are showing
        let isCorrect = false;
        const letterMatch = userAnswer.match(/^[ABCDE]$/i);

        if (letterMatch && activeQuiz.showingOptions) {
            // User typed a letter and options are visible
            const letterIndex = letterMatch[0].toUpperCase().charCodeAt(0) - 65; // A=0, B=1, etc.
            const selectedCountry = activeQuiz.options[letterIndex];
            isCorrect = this.isCorrectAnswer(selectedCountry, correctCountry);
        } else {
            // User typed country name directly
            isCorrect = this.isCorrectAnswer(userAnswer, correctCountry);
        }

        // Update user stats
        this.db.updateUserStats(message.author.id, quizType, isCorrect);

        // React to the message
        try {
            if (isCorrect) {
                await message.react('✅');

                // Send correct answer embed
                const embed = this.createCorrectAnswerEmbed(quizType, quizData, correctCountry, message.author.displayName);
                await message.reply({ embeds: [embed] });

                console.log(`✅ Correct answer by ${message.author.tag}: ${userAnswer} -> ${correctCountry}`);

                // Clear the current quiz
                this.activeQuizzes.delete(message.channel.id);
                this.wrongAttempts.delete(message.channel.id);

                // Post new question after delay
                setTimeout(async () => {
                    await this.postNewQuestion(message.channel);
                }, 3000); // 3 second delay before next question

            } else {
                await message.react('❌');
                console.log(`❌ Incorrect answer by ${message.author.tag}: ${userAnswer} -> ${correctCountry}`);

                // Increment wrong attempts
                const currentWrong = this.wrongAttempts.get(message.channel.id) || 0;
                this.wrongAttempts.set(message.channel.id, currentWrong + 1);

                console.log(`📊 Wrong attempts for ${message.channel.id}: ${currentWrong + 1}/5`);

                // Show options after 5 wrong attempts
                if (currentWrong + 1 >= 5 && !activeQuiz.showingOptions) {
                    activeQuiz.showingOptions = true;

                    const embed = this.createQuizEmbed(quizType, quizData, correctCountry, true);

                    // Update the activeQuiz options to match the displayed options
                    activeQuiz.options = embed.quizOptions;
                    this.activeQuizzes.set(message.channel.id, activeQuiz);

                    await message.channel.send({
                        content: "💡 **Hint time!** Here are the multiple choice options:",
                        embeds: [embed]
                    });

                    console.log(`💡 Showing options for ${quizData} after ${currentWrong + 1} wrong attempts`);
                }
            }
        } catch (error) {
            console.error('❌ Error reacting to message:', error);
        }

        return isCorrect;
    }

    isQuizChannel(channelId) {
        return this.quizChannels.has(channelId);
    }

    async initializeQuizChannels(client) {
        try {
            // Start fresh quizzes in both channels when bot starts
            const tldChannelId = '1419838438349344829';
            const flagsChannelId = '1420033591458398258';

            // Initialize TLD quiz
            const tldChannel = await client.channels.fetch(tldChannelId);
            if (tldChannel) {
                console.log('🔄 Starting fresh TLD quiz...');
                await this.postNewQuestion(tldChannel);
            }

            // Initialize Flags quiz
            const flagsChannel = await client.channels.fetch(flagsChannelId);
            if (flagsChannel) {
                console.log('🔄 Starting fresh Flags quiz...');
                await this.postNewQuestion(flagsChannel);
            }
        } catch (error) {
            console.error('❌ Error initializing quiz channels:', error);
        }
    }
}

module.exports = QuizManager;