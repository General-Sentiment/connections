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

Content and durable submission metadata live on Are.na. Profiles are discovered through the group's channels, including unfinished profiles; conversations are discovered through the signed-in account and their participant metadata. There is no application database or filesystem storage requirement.

User sessions use encrypted HTTP-only cookies. Photo uploads carry a signed, expiring receipt tied to the uploading account. Pending message drafts and their retry IDs are temporarily kept in browser session storage until sending succeeds. Group IDs, About block ID, and the server-only group operator credential belong in environment variables. Never expose operator credentials through a `NEXT_PUBLIC_` variable.

Retries read existing Are.na items before creating missing parts. Message IDs and payload hashes live in connection metadata; profile and conversation channels have deterministic identity metadata. Local worker locks reduce concurrent submissions, but Are.na does not provide atomic create-once semantics: simultaneous workers or delayed search indexing can still produce duplicates. Failed discovery stops writes instead of assuming no item exists.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

The `/setup` page exposes owner-only development checks that perform real temporary Are.na writes. Run them only intentionally. They are unavailable in production.

## Deployment

Vercel's Node runtime is supported; no writable disk is required. Set `APP_URL` to the deployed origin and register its `/api/auth/callback` URL with Are.na. Configure `ARENA_CLIENT_ID`, `ARENA_CLIENT_SECRET` if used, `SESSION_SECRET`, `ARENA_GROUP_ID`, `ARENA_ABOUT_BLOCK_ID`, and `DEMO_MODE=false`.

Supply `ARENA_OPERATOR_TOKEN` for a group administrator, or `ARENA_DIRECTORY_CREDENTIAL` containing the existing sealed credential encrypted with the same `SESSION_SECRET`. This credential is used only for group-owned profile operations; private conversations use the signed-in user's credential. `/setup` validates configuration; it does not persist settings on the server.

Run `npm run build` and `npm start` locally, or deploy the source with Vercel. The prior `.data/` SQLite files are ignored legacy backups and are no longer read by the app.

Are.na v3 handles content operations. Individual sharing currently depends on its legacy v2 collaborator endpoint; see the plan for verified behavior and remaining live checks.

### Location filtering

City suggestions use Photon (OpenStreetMap) through the authenticated `/api/locations` route. Searches are debounced and cached for a day. `PHOTON_URL` can point to a private Photon server; the default is its public service, intended for modest usage and without an availability guarantee. No API key is required. Suggestions use OSM object IDs, and NYC/New York City share the New York lookup.

Selecting a city saves its ID, region, and ISO country code in the details block. Profile saves mirror these into channel metadata (`location_id`, `location_city`, `location_region`, `location_country`) for filtering before fetching full profiles. Old profiles remain readable; they gain metadata on their next save. Editing city or country clears the previous normalized ID. Unmatched free-text locations remain usable and can be filtered by country after saving, but need a selected suggestion for city filtering. Existing locations are never automatically geocoded or reassigned.

### Profile prompts

The profile editor loads text blocks from `ARENA_PROMPTS_CHANNEL` (default `prompts-lkiimgy92_0`) each time it opens, without the local public cache. Each selection pairs a unique prompt with a public block or channel. Profiles require at least three selections and can include more. Clicking either a block or channel in the picker selects it. Original prompt blocks are connected immediately before their responses in the profile channel. Chosen prompt IDs and text are also saved in the profile’s details block so changes to the prompt catalog do not rewrite existing profiles.

Public directory and profile reads reuse the in-memory API cache for up to 60 seconds (or less when Are.na requests it). Successful writes invalidate it immediately. Prompt loading, recent items, and publication checks stay uncached; authenticated responses are never stored in the public cache. The cache is per server process, so separate instances can still make independent requests.
