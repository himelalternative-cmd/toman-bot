# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- `pnpm --filter @workspace/discord-bot run start` — run the Discord moderation bot locally (or `node discord-bot/src/index.js`). Requires `DISCORD_TOKEN` and `CLIENT_ID` secrets, plus Server Members Intent and Message Content Intent enabled in the Discord Developer Portal. Meant to be hosted on Railway, not deployed via Replit.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- `discord-bot/`: standalone plain-JS ESM package (discord.js v14 + dotenv), not a TypeScript project and not registered as an artifact

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._
- `discord-bot/src/commands/{moderation,utility,info,admin,fun}/` — slash commands, auto-loaded and auto-registered on startup
- `discord-bot/src/events/`, `discord-bot/src/handlers/`, `discord-bot/src/utils/` — event listeners, command/event loaders, and shared helpers (embeds, JSON storage, permissions, cooldowns)
- `discord-bot/src/data/{warnings,config}.json` — JSON-file storage (no database)

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
