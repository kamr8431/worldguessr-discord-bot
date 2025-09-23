# WorldGuessr Discord Bot

A comprehensive Discord bot featuring interactive quiz systems, player statistics, and WorldGuessr game integration. Built with Discord.js v14 and SQLite.

## 🎯 Features

### 🌍 Interactive Quiz System
- **Country TLD Quiz** - Learn country top-level domains (.com, .uk, .de, etc.)
- **Country Flag Quiz** - Identify countries by their flag emojis 🇺🇸🇬🇧🇯🇵
- **Progressive Difficulty** - Starts hard, shows multiple choice after 5 wrong attempts
- **Cross-platform** - Works with both slash commands (`/`) and message commands (`!`)
- **Persistent Questions** - Questions remain until someone gets the correct answer

### 📊 Statistics & Leaderboards
- **Individual Stats** - Track your accuracy and progress per quiz category
- **Overall Leaderboards** - See top players across all quiz types
- **Category Leaderboards** - Compete in specific quiz categories
- **Detailed Analytics** - View correct/incorrect answers, accuracy percentages, attempt counts

### 🎮 WorldGuessr Integration
- **Player Stats Lookup** - Check any WorldGuessr player's game statistics
- **Beautiful Embeds** - Rich, formatted displays with proper styling

### 🛠️ Modular Architecture
- **Auto-detecting Commands** - Commands are automatically discovered and loaded
- **Seamless Dual Interface** - Every command works with both `/command` and `!command`
- **Generic Utilities** - Reusable components for easy development
- **Clean Code Structure** - Well-organized, maintainable codebase

## 📋 Commands

### Quiz Commands
All quiz interactions happen by simply chatting in designated quiz channels - no commands needed!

### Information Commands
| Slash Command | Message Command | Description |
|---------------|-----------------|-------------|
| `/stats [user] [category]` | `!stats` | View quiz statistics for yourself or another user |
| `/leaderboard [category] [limit]` | `!leaderboard` | View quiz leaderboards (overall, TLD, or flags) |
| `/check <username>` | `!check <username>` | Look up WorldGuessr player statistics |
| `/hello` | `!hello` | Test command to verify bot functionality |

### Command Parameters
- **category**: `tld` (Country TLD Quiz) or `flags` (Country Flag Quiz)
- **limit**: Number of users to show on leaderboard (5-25, default: 10)
- **user**: Mention another Discord user to check their stats

## 🚀 Setup

### Prerequisites
- Node.js (v16 or higher)
- Discord Bot Token
- Discord Application ID

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd worldguessr-discord-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_client_id_here
   ```

4. **Start the bot**
   ```bash
   npm start
   ```

## 🤖 Discord Bot Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Navigate to the "Bot" section and create a bot
4. Copy the bot token → add to `.env` as `DISCORD_TOKEN`
5. Copy the Application ID → add to `.env` as `CLIENT_ID`
6. In "OAuth2" section, generate invite link with scopes:
   - `bot`
   - `applications.commands`
7. Add bot permissions:
   - Send Messages
   - Use Slash Commands
   - Embed Links
   - Read Message History
   - Add Reactions
8. Invite the bot to your Discord server

## 🎯 Quiz Setup

### Channel Configuration
The bot uses specific channel IDs for different quiz types:
- **TLD Quiz Channel**: `1419838438349344829`
- **Flags Quiz Channel**: `1420033591458398258`

To set up quiz channels in your server:
1. Create dedicated channels for each quiz type
2. Update the channel IDs in `quiz/quizManager.js` (lines 15-16)
3. Update the database categories in `database/database.js` (lines 62-63)

### How Quiz System Works
1. **Automatic Questions** - Bot posts random questions when started
2. **Community Answering** - Anyone can answer by typing in the quiz channel
3. **Progressive Difficulty**:
   - Initial: Hard mode (no options)
   - After 5 wrong attempts: Multiple choice (A, B, C, D, E)
4. **Answer Methods**:
   - Type full country name: `"United States"`
   - Type letter choice: `"A"` or `"a"`
   - Alternative names accepted: `"USA"`, `"America"`, `"US"`
5. **Immediate Feedback** - Bot reacts with ✅ or ❌ and shows correct answer

## 🗃️ Database

The bot uses SQLite for data persistence:
- **User Statistics** - Individual performance tracking per category
- **Quiz Categories** - Configuration for different quiz types
- **Database File** - `database/quiz_data.db` (auto-created, git-ignored)

### Database Schema
```sql
-- User quiz performance
user_stats (user_id, category, correct, incorrect, total_attempts, last_attempt)

-- Quiz category configuration
quiz_categories (category, channel_id, enabled, auto_post, description)
```

## 🏗️ Architecture

### File Structure
```
worldguessr-discord-bot/
├── commands/                 # Command implementations
│   ├── check.js             # WorldGuessr player lookup
│   ├── hello.js             # Test command
│   ├── leaderboard.js       # Quiz leaderboards
│   └── stats.js             # User statistics
├── database/                # Database layer
│   └── database.js          # SQLite operations
├── handlers/                # Core bot handlers
│   └── commandHandler.js    # Command loading and routing
├── quiz/                    # Quiz system
│   └── quizManager.js       # Quiz logic and management
├── utils/                   # Utility functions
│   ├── commandHandler.js    # Unified command processing
│   └── genericUtils.js      # Reusable helper functions
├── country_flags.json       # Flag emoji mappings
├── country_tlds.json        # TLD to country mappings
└── index.js                 # Main bot entry point
```

### Adding New Commands

Thanks to the seamless command handler system, adding new commands is incredibly easy:

```javascript
// commands/newcommand.js
const { SlashCommandBuilder } = require('discord.js');
const CommandHandler = require('../utils/commandHandler');

// Core logic - works for both slash and message commands
async function newCommandLogic({ param1, param2, isSlash }) {
    // Your command logic here
    const embed = new EmbedBuilder()
        .setTitle('New Command')
        .setDescription('Command response');

    return { embed };
}

// Parameter configuration
const paramConfig = {
    param1: { type: 'string', default: 'defaultValue' },
    param2: { type: 'user', default: null }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('newcommand')
        .setDescription('Description of new command')
        .addStringOption(option =>
            option.setName('param1').setDescription('Parameter description')),

    async execute(interaction) {
        const params = CommandHandler.extractSlashParams(interaction, paramConfig);
        await CommandHandler.handleCommand(newCommandLogic, params);
    },

    async executeMessage(message, args) {
        const params = CommandHandler.extractMessageParams(message, args, paramConfig);
        await CommandHandler.handleCommand(newCommandLogic, params);
    }
};
```

That's it! Your command automatically supports:
- ✅ Slash commands (`/newcommand`)
- ✅ Message commands (`!newcommand`)
- ✅ Unified error handling
- ✅ Consistent response formatting
- ✅ Parameter extraction

## 🧪 Development

### Available Scripts
```bash
npm start          # Start the bot
npm run dev        # Start the bot (development alias)
```

### Hot Reload
In development mode, send `SIGUSR2` to reload commands without restarting:
```bash
kill -SIGUSR2 <process_id>
```

### Git Workflow
The bot includes commit automation. When making changes:
```bash
# Changes are automatically committed with detailed messages
# Including co-authorship attribution to Claude
```

## 📊 Usage Examples

### Quiz Interaction
```
Bot: 🌍 Country TLD Quiz
     Which country uses the TLD: `.jp`?
     Type the country name to answer!

User: Japan
Bot: ✅ Correct!
     Japan uses `.jp`
     🎉 Well done, Username!
     Next question coming up...
```

### Stats Command
```
/stats user:@friend category:flags

📊 Country Flags Quiz Stats
Statistics for Friend

✅ Correct Answers: 45
❌ Incorrect Answers: 12
📈 Accuracy: 78.9%
🎯 Total Attempts: 57
⏰ Last Attempt: 12/23/2024
```

### Leaderboard Command
```
/leaderboard category:overall limit:5

🏆 Overall Quiz Leaderboard
Top 5 players by correct answers

🥇 TopPlayer
   ✅ 156 correct • ❌ 23 wrong • 📈 87.2% accuracy

🥈 SecondPlace
   ✅ 134 correct • ❌ 31 wrong • 📈 81.2% accuracy
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes using the established architecture patterns
4. Test with both slash and message commands
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📝 License

ISC License - see LICENSE file for details.

## 🔗 Links

- [Discord.js Documentation](https://discord.js.org/#/docs)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [WorldGuessr Website](https://worldguessr.com)

---

**Built with ❤️ using Discord.js v14, SQLite, and modern JavaScript**