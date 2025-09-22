# WorldGuessr Discord Bot

A Discord bot for WorldGuessr game integration built with Discord.js v14.

## Features

- `/hello` - Simple hello world command to test bot functionality

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your Discord bot credentials:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_client_id_here
   ```

4. Start the bot:
   ```bash
   npm start
   ```

## Discord Bot Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section and create a bot
4. Copy the bot token and add it to your `.env` file as `DISCORD_TOKEN`
5. Copy the Application ID and add it to your `.env` file as `CLIENT_ID`
6. Go to the "OAuth2" section and generate an invite link with the "bot" and "applications.commands" scopes
7. Invite the bot to your Discord server

## Commands

- `/hello` - Returns a hello world message

## Development

- `npm start` - Start the bot
- `npm run dev` - Start the bot (alias for start)

## License

ISC