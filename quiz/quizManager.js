const { EmbedBuilder } = require('discord.js');
const QuizDatabase = require('../database/database');
const countryTlds = require('../country_tlds.json');

class QuizManager {
    constructor() {
        this.db = new QuizDatabase();
        this.tldData = this.prepareTldData();
        this.quizChannels = new Set();
        this.autoTimers = new Map();
        this.wrongAttempts = new Map(); // Track wrong attempts per channel
        this.activeQuizzes = new Map(); // Store active quiz data in memory

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

    createQuizEmbed(tld, correctCountry, showOptions = false, questionNumber = null) {
        let embed;

        if (showOptions) {
            const options = this.getRandomCountryOptions(correctCountry);

            const optionsText = options.map((country, index) => {
                const letters = ['A', 'B', 'C', 'D', 'E'];
                return `${letters[index]}) ${country}`;
            }).join('\n');

            embed = new EmbedBuilder()
                .setTitle('🌍 Country TLD Quiz')
                .setDescription(`**Which country uses the TLD: \`${tld}\`?**\n\n${optionsText}\n\n*Type the country name or letter (A, B, C, D, E) to answer!*`)
                .setColor('#e67e22') // Orange color for hint mode
                .setFooter({
                    text: 'Quiz System • Multiple choice hint mode',
                    iconURL: 'https://worldguessr.com/favicon.ico'
                })
                .setTimestamp();

            // Store the options for later reference
            embed.quizOptions = options;
        } else {
            embed = new EmbedBuilder()
                .setTitle('🌍 Country TLD Quiz')
                .setDescription(`**Which country uses the TLD: \`${tld}\`?**\n\n*Type the country name to answer!*`)
                .setColor('#3498db')
                .setFooter({
                    text: 'Quiz System • Type the country name',
                    iconURL: 'https://worldguessr.com/favicon.ico'
                })
                .setTimestamp();
        }

        if (questionNumber) {
            embed.setTitle(`🌍 Country TLD Quiz #${questionNumber}`);
        }

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

            // Store the active quiz in memory
            this.activeQuizzes.set(channel.id, {
                tld,
                country,
                options,
                showingOptions: false
            });

            // Reset wrong attempts for new question
            this.wrongAttempts.set(channel.id, 0);

            console.log(`🔄 New question posted for ${channel.id}: ${tld} -> ${country}, wrong attempts reset to 0`);

            const embed = this.createQuizEmbed(tld, country, false);
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
                const activeQuiz = this.activeQuizzes.get(channel.id);
                if (activeQuiz) {
                    // Clear current quiz and post new one directly
                    this.activeQuizzes.delete(channel.id);
                    this.wrongAttempts.delete(channel.id);
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
        const correctCountry = activeQuiz.country;
        const tld = activeQuiz.tld;

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
                this.activeQuizzes.delete(message.channel.id);
                this.wrongAttempts.delete(message.channel.id);
                this.clearAutoTimeout(message.channel.id);

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
                    this.activeQuizzes.set(message.channel.id, activeQuiz);

                    const embed = this.createQuizEmbed(tld, correctCountry, true);
                    await message.channel.send({
                        content: "💡 **Hint time!** Here are the multiple choice options:",
                        embeds: [embed]
                    });

                    console.log(`💡 Showing options for ${tld} after ${currentWrong + 1} wrong attempts`);
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
            // Always post a fresh question when bot starts
            const tldChannelId = '1419838438349344829';
            const channel = await client.channels.fetch(tldChannelId);

            if (channel) {
                console.log('🔄 Starting fresh TLD quiz...');
                await this.postNewQuestion(channel);
            }
        } catch (error) {
            console.error('❌ Error initializing quiz channels:', error);
        }
    }
}

module.exports = QuizManager;