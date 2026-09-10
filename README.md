# Connections

A Next.js app with Are.na-backed profiles and private conversations. Product and storage decisions are in [docs/plan.md](docs/plan.md).

## Run locally

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open http://127.0.0.1:3000. Configure `ARENA_CLIENT_ID`, `APP_URL`, and a random `SESSION_SECRET` of at least 32 characters. Register the exact callback `APP_URL/api/auth/callback` with Are.na. PKCE is supported; the client secret is optional.

Without live setup, `DEMO_MODE=true` shows labeled sample data and disables writes. Sign in and visit `/setup` as the connections.forum group owner to create/configure the directory and enable group-owned profiles. Setup switches the persisted configuration to live mode. The existing workspace is already configured.

## Storage and access

Profile channels belong to the directory group. A sealed operator credential creates those channels and grants each author collaboration; their own token writes profile blocks. Conversation channels belong to a participant, have exactly two individual members, and never use the operator credential. Each conversation read and write rechecks its actual Are.na access list.

Content is stored on Are.na. SQLite in `.data/` holds operational references, retry records and the encrypted operator credential. User tokens are sealed in HTTP-only cookies. Keep `.env.local`, `.data/`, and the session encryption key private. Losing the key invalidates sessions and the stored operator credential; reconnect through setup.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

The `/setup` page exposes owner-only development checks that perform real temporary Are.na writes. Run them only intentionally. They are unavailable in production.

## Deployment

Use a Node runtime with persistent storage for `DATABASE_PATH`. Run `npm run build` and `npm start`; configure the production `APP_URL`, HTTPS OAuth callback, secrets and backups. This project is not a static export or a Cloudflare Worker build. SQLite coordination assumes one application host.

Are.na v3 handles content operations. Individual sharing currently depends on its legacy v2 collaborator endpoint; see the plan for verified behavior and remaining live checks.
