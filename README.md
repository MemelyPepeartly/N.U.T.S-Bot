# N.U.T.S-Bot

An admin-only Discord bot that copies custom soundboard sounds between servers.

## Setup

1. Create a Discord application and bot, then invite the bot to both servers with the `bot` and `applications.commands` OAuth scopes. The bot needs the `Create Guild Expressions` permission in both servers.
2. Set `DISCORD_TOKEN` to the bot token and `DISCORD_APPLICATION_ID` to the application ID.
3. Install dependencies with `npm install`.
4. Register the slash command with `npm run register-commands`.
5. Start the bot with `npm start`.

Use `/transfer-soundboard` in a server and provide the source and destination server IDs. The requesting user must be an administrator in both servers. Existing sounds with matching names (case-insensitive) and unavailable sounds are skipped. The bot reports copied, skipped, and failed counts; individual sounds that cannot be copied do not stop the rest of the transfer.

Discord limits custom sound files to 512 KB and 5.2 seconds. Sound names, volume, and Unicode emoji are copied; custom emoji are omitted because their IDs are server-specific.

Run the focused tests with `npm test`.
