# Discord Moderation Bot

A production-ready Discord moderation bot built with discord.js v14 — slash commands, JSON-based storage (no database), moderation logging, warnings, welcome/goodbye systems, and role/permission hierarchy protection.

## Setup

1. Create an application at the [Discord Developer Portal](https://discord.com/developers/applications), add a Bot user, and copy its **Token**.
2. Copy `.env.example` to `.env` and fill in `DISCORD_TOKEN` and `CLIENT_ID` (your application's ID). `GUILD_ID` is optional — set it during development for instant command registration in one server; leave it blank for global commands (registration can take up to an hour to propagate).
3. Under **Bot** in the Developer Portal, enable the **Server Members Intent** and **Message Content Intent** — both are required for the welcome/goodbye system and message-edit/delete logging.
4. Install dependencies: `npm install` (from this `discord-bot/` folder).
5. Invite the bot to your server with the `bot` and `applications.commands` scopes (use `/invite` after the bot is online, or build a link from the Developer Portal's OAuth2 URL Generator).
6. Start the bot: `npm start`. Slash commands are registered automatically on startup. To register them without starting the bot (e.g. as a separate deploy step), run `npm run deploy-commands`.

## Commands

- **Moderation:** `/ban`, `/unban`, `/kick`, `/timeout`, `/warn`, `/warnings`, `/removewarn`, `/clearwarns`, `/purge`, `/slowmode`, `/lock`, `/unlock`, `/nickname`, `/setlog`
- **Info:** `/serverinfo`, `/userinfo`, `/avatar`, `/banner`, `/roleinfo`, `/channelinfo`, `/botinfo`
- **Utility:** `/ping`, `/invite`, `/help`, `/uptime`
- **Admin:** `/setwelcome`, `/setgoodbye`
- **Fun:** `/coinflip`, `/8ball`

## Adding a New Command

Create a new file under `src/commands/<category>/` exporting `{ data, permissions?, botPermissions?, cooldown?, execute(interaction, client) }`. It's picked up automatically on the next restart — no manual registration needed.

## Data Storage

- `src/data/warnings.json` — per-guild, per-user warning history.
- `src/data/config.json` — per-guild settings (log channel, welcome/goodbye config).

Both files are created automatically on first run if missing.

## Hosting on Railway

1. Push this `discord-bot/` folder to its own GitHub repo (or deploy it as a subdirectory service if Railway supports monorepo root-directory configuration).
2. Create a new Railway project from that repo, set the root directory to `discord-bot` if needed.
3. Add the `DISCORD_TOKEN`, `CLIENT_ID`, and optionally `GUILD_ID` environment variables in Railway's dashboard.
4. Set the start command to `npm start` (Railway auto-detects this from `package.json`).
