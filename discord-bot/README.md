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
- **Admin:** `/setwelcome`, `/setgoodbye`, `/createticketpanel`, `/ticketaccess add|remove`, `/settranscriptchannel`
- **Voice:** `/247 enable|disable`
- **Fun:** `/coinflip`, `/8ball`
- **Auto-React:** `/autoreact set|remove`

## Ticket System

- `/createticketpanel` posts an embed with a **"Select a category"** dropdown in a channel of your choice, letting users pick a reason before opening a ticket: 🎁 Claim Reward, ❗ Report, 🪙 Buy Something, ✨ Others. Each panel has its own Discord channel category (where ticket channels get created) and an optional support role baked in — all four ticket reasons on a given panel share that same channel category and role.
- Picking a category opens a private channel named `ticket-<username>`, visible only to the ticket opener, admins (via the Administrator permission, which always bypasses channel overwrites), ticket staff, and the support role (if set). The chosen category is shown as a field on the ticket embed. Each user can only have one open ticket at a time.
- Every ticket channel has four buttons:
  - **📌 Claim** — assigns the ticket to whoever clicks it (admins or ticket staff only), renames the channel to `claimed-<username>`, and disables itself.
  - **✅ Mark as Done** — renames the channel to `done-<username>` and schedules the ticket to auto-delete in 12 hours (checked every 5 minutes, so it survives bot restarts).
  - **🗑️ Delete Ticket** — asks for confirmation, then deletes the channel.
  - **📄 Delete + Transcript** — generates an HTML transcript (styled like Discord, via `discord-html-transcripts`) and a plain-text transcript, sends both to the configured transcript channel, then deletes the ticket.
- `/ticketaccess add|remove` manages who counts as "ticket staff" (stored in `ticketAccess.json`) — these users can claim, mark done, delete, and generate transcripts for any ticket without needing Administrator.
- `/settranscriptchannel` sets where transcripts get sent. `/setlog` (already used for moderation logs) also receives ticket lifecycle events: created, claimed, marked done, deleted, and transcript created.

## Adding a New Command

Create a new file under `src/commands/<category>/` exporting `{ data, permissions?, botPermissions?, cooldown?, execute(interaction, client) }`. It's picked up automatically on the next restart — no manual registration needed.

## 24/7 Voice Presence

- `/247 enable [channel]` joins a voice channel (your current one by default) and stays connected indefinitely — it automatically rejoins if kicked, disconnected, or the bot restarts.
- `/247 disable` leaves the channel and turns auto-rejoin off.
- Requires the **Manage Server** permission and the bot's **Connect**/**Speak** permissions in that channel.

## Auto-React

- `/autoreact set <channel> <emojis>` — every new message posted in that channel automatically gets reacted to with the given emojis (space-separated, e.g. `👍 🎉` or a custom emoji like `<:pepe:123456789012345678>`). The command test-reacts to a throwaway message first and rejects any emoji it can't use.
- `/autoreact remove <channel>` — stops auto-reacting in that channel.
- Requires the **Manage Server** permission and the bot's **Add Reactions** permission.

## Data Storage

- `src/data/warnings.json` — per-guild, per-user warning history.
- `src/data/config.json` — per-guild settings (log channel, transcript channel, welcome/goodbye config).
- `src/data/tickets.json` — open/done ticket records per guild (ticket ID, opener, channel, claim/done status).
- `src/data/ticketAccess.json` — per-guild list of user IDs granted ticket-staff access.
- `src/data/vc247.json` — per-guild 24/7 voice channel config.
- `src/data/autoReact.json` — per-guild, per-channel list of emojis to auto-react with.

All files are created automatically on first run if missing.

By default everything above lives under `src/data/` inside the bot's own filesystem. That's fine for local development, but most hosts (including Railway) rebuild the container from a fresh copy of the repo on every deploy — anything written to the local disk at runtime, and any data file that's tracked in git, gets wiped or reset to its last-committed snapshot. Set `DATA_DIR` to a persistent volume's mount path (see below) so this data survives redeploys and bot restarts.

## Hosting on Railway

1. Push this `discord-bot/` folder to its own GitHub repo (or deploy it as a subdirectory service if Railway supports monorepo root-directory configuration).
2. Create a new Railway project from that repo, set the root directory to `discord-bot` if needed.
3. Add the `DISCORD_TOKEN`, `CLIENT_ID`, and optionally `GUILD_ID` environment variables in Railway's dashboard.
4. **Attach a Volume so data survives redeploys:** in the service's **Settings → Volumes** tab, click **New Volume**, mount it at `/data` (any path works, just be consistent). Then add a `DATA_DIR=/data` environment variable. Without this, every redeploy resets warnings, tickets, 24/7 config, and auto-react settings back to empty.
5. Set the start command to `npm start` (Railway auto-detects this from `package.json`).
