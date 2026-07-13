---
name: Non-artifact workspace packages
description: How to add a service (e.g. a Discord bot) that isn't a web app, mobile app, or other supported artifact type, and won't be deployed via Replit.
---

When a request is for a backend-only service with no web preview and no fit among the `createArtifact` kinds (react-vite, expo, slides, video-js, openscad, etc.) — e.g. a Discord bot hosted on Railway — build it as a plain top-level workspace package (like the existing `scripts` package), not under `artifacts/`.

**Why:** Artifacts are for things with a preview path the user can view in the Replit iframe and that the artifacts skill knows how to deploy. A gateway-based bot or similar always-connects-out service has no HTTP surface to preview, and the user explicitly wanted external (Railway) hosting rather than a Replit deployment. Forcing it into the artifact system would require a fake preview path and register it for a deploy flow that doesn't apply.

**How to apply:**
- Create the package directory at the workspace root (e.g. `discord-bot/`), with its own `package.json` (`name: @workspace/<name>`, own dependencies — don't lean on root deps).
- Add the directory to `packages:` in `pnpm-workspace.yaml` manually (it won't be picked up by the `artifacts/*` glob).
- Don't add it to the root TypeScript project references or typecheck globs unless it's actually TypeScript.
- Run `pnpm install` from the repo root after adding it so the lockfile/workspace picks it up.
- No workflow/artifact registration needed — verify by running the entry script directly with `node` (or a short `timeout N node ...` smoke test) rather than via a workflow or `Screenshot`.
- Request any required secrets (e.g. bot tokens, client IDs) via the environment-secrets flow as usual; document them in a `.env.example` at the package root since there's no Replit-managed env UI equivalent for an undeployed package.
