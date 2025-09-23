const { EmbedBuilder } = require('discord.js');
const QuizDatabase = require('../database/database');
const countryTlds = require('../country_tlds.json');

class QuizManager {
    constructor() {
        this.db = new QuizDatabase();
        this.tldData = this.prepareTldData();
        this.quizChannels = new Set();
        this.autoTimers = new Map();

        // Add the TLD quiz channel
        this.quizChannels.add('1419838438349344829');
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

    getRandomTld() {
        const tlds = this.tldData.allTlds;
        const randomTld = tlds[Math.floor(Math.random() * tlds.length)];
        const country = this.tldData.tldToCountry[randomTld];
        return { tld: randomTld, country };
    }

    getRandomCountryOptions(correctCountry, count = 5) {
        const allCountries = Object.keys(countryTlds);
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

    createQuizEmbed(tld, correctCountry, questionNumber = null) {
        const options = this.getRandomCountryOptions(correctCountry);

        const optionsText = options.map((country, index) => {
            const letters = ['A', 'B', 'C', 'D', 'E'];
            return `${letters[index]}) ${country}`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setTitle('🌍 Country TLD Quiz')
            .setDescription(`**Which country uses the TLD: \`${tld}\`?**\n\n${optionsText}\n\n*Type the country name or letter (A, B, C, D, E) to answer!*`)
            .setColor('#3498db')
            .setFooter({
                text: 'Quiz System • Type country name or letter to answer',
                iconURL: 'https://worldguessr.com/favicon.ico'
            })
            .setTimestamp();

        if (questionNumber) {
            embed.setTitle(`🌍 Country TLD Quiz #${questionNumber}`);
        }

        // Store the options in the embed for later reference
        embed.quizOptions = options;

        return embed;
    }

    createCorrectAnswerEmbed(tld, country, userName, streak = null) {
        const embed = new EmbedBuilder()
            .setTitle('✅ Correct!')
            .setDescription(`**${country}** uses \`${tld}\`\n\n🎉 Well done, ${userName}!`)
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

    createIncorrectAnswerEmbed(tld, correctCountry, userAnswer, userName) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Incorrect!')
            .setDescription(`**${correctCountry}** uses \`${tld}\`\n\nYou answered: **${userAnswer}**`)
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
            const { tld, country } = this.getRandomTld();
            const options = this.getRandomCountryOptions(country);

            // Store the active quiz in database with options
            this.db.setActiveQuiz(channel.id, 'tld', tld, country, JSON.stringify(options));

            const embed = this.createQuizEmbed(tld, country);
            await channel.send({ embeds: [embed] });

            console.log(`📝 Posted TLD quiz: ${tld} -> ${country} in ${channel.name}`);

            // Set up auto-timeout for unanswered questions (60 seconds)
            this.setAutoTimeout(channel);

            return true;
        } catch (error) {
            console.error('❌ Error posting quiz question:', error);
            return false;
        }
    }

    setAutoTimeout(channel) {
        // Clear any existing timer
        this.clearAutoTimeout(channel.id);

        // Set new timer for 60 seconds
        const timer = setTimeout(async () => {
            try {
                const activeQuiz = this.db.getActiveQuiz(channel.id);
                if (activeQuiz) {
                    // Clear current quiz and post new one directly
                    this.db.clearActiveQuiz(channel.id);
                    await this.postNewQuestion(channel);
                }
            } catch (error) {
                console.error('❌ Error handling auto timeout:', error);
            }
        }, 60000); // 60 seconds

        this.autoTimers.set(channel.id, timer);
    }

    clearAutoTimeout(channelId) {
        const timer = this.autoTimers.get(channelId);
        if (timer) {
            clearTimeout(timer);
            this.autoTimers.delete(channelId);
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
        const correctCountry = activeQuiz.correct_answer;
        const tld = activeQuiz.question;

        // Check if answer is a letter (A, B, C, D, E)
        let isCorrect = false;
        const letterMatch = userAnswer.match(/^[ABCDE]$/i);

        if (letterMatch && activeQuiz.options) {
            // User typed a letter, check against options
            const letterIndex = letterMatch[0].toUpperCase().charCodeAt(0) - 65; // A=0, B=1, etc.
            const options = JSON.parse(activeQuiz.options);
            const selectedCountry = options[letterIndex];
            isCorrect = this.isCorrectAnswer(selectedCountry, correctCountry);
        } else {
            // User typed country name directly
            isCorrect = this.isCorrectAnswer(userAnswer, correctCountry);
        }

        // Update user stats
        this.db.updateUserStats(message.author.id, 'tld', isCorrect);

        // React to the message
        try {
            if (isCorrect) {
                await message.react('✅');

                // Send correct answer embed
                const embed = this.createCorrectAnswerEmbed(tld, correctCountry, message.author.displayName);
                await message.reply({ embeds: [embed] });

                console.log(`✅ Correct answer by ${message.author.tag}: ${userAnswer} -> ${correctCountry}`);

                // Clear the current quiz and auto timeout
                this.db.clearActiveQuiz(message.channel.id);
                this.clearAutoTimeout(message.channel.id);

                // Post new question after delay
                setTimeout(async () => {
                    await this.postNewQuestion(message.channel);
                }, 3000); // 3 second delay before next question

            } else {
                await message.react('❌');
                console.log(`❌ Incorrect answer by ${message.author.tag}: ${userAnswer} -> ${correctCountry}`);
                // Don't post new question, just react and continue
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
            // Always post a fresh question when bot starts
            const tldChannelId = '1419838438349344829';
            const channel = await client.channels.fetch(tldChannelId);

            if (channel) {
                // Clear any existing quiz and post fresh question
                this.db.clearActiveQuiz(tldChannelId);
                console.log('🔄 Starting fresh TLD quiz...');
                await this.postNewQuestion(channel);
            }
        } catch (error) {
            console.error('❌ Error initializing quiz channels:', error);
        }
    }
}

module.exports = QuizManager;