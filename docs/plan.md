> Current storage architecture: Are.na is the only durable application content store. Configuration is in server environment variables; sessions and upload proofs are encrypted/signed. SQLite has been removed. Historical implementation notes below describing SQLite are superseded by this section and the README.

# Connections

## Purpose

A Next.js application for meeting people through their interests and collections on Are.na. People log in with Are.na, optionally add a profile, browse other people, and start private conversations containing messages, blocks, and channels.

Are.na channels, blocks, and connections are the app's content storage. Use the current Are.na v3 API. Profiles and conversations should remain understandable and usable directly in Are.na.

This document consolidates the product decisions from planning. Technical proposals and unresolved API questions are identified separately below.

## Agreed product behavior

### Directory

- The root page renders the user profile channels connected into the main directory channel.
- Use the Connections group: https://www.are.na/connections-forum.
- Each person has a profile channel associated with this directory and group structure.
- Visitors can browse profiles. Login and publishing a profile are separate actions; logging in does not add someone automatically.
- Provide an **Add yourself** action and an **Edit profile** action for an existing profile.
- Do not include a global top toolbar or a Search people field.

### Profile creation and editing

Use a simple form with these fields:

| Field | Behavior |
| --- | --- |
| Are.na account | Derive identity and profile link from the authenticated account. |
| Photo of yourself | Optional upload. Creates an image block in the profile channel, titled with the person's name. Allow replacement or removal. |
| What you're looking for | Textarea saved as a text block in the profile channel. |
| City | Location field. |
| Country | Location field; do not store a country code. |
| Open to | Multiple checkboxes: Conversation, Friendship, Creative partnership, Romance, Meeting new people. |
| Local only | Checkbox. Proposed wording: “Only people in my area.” Unchecked means open to people elsewhere. |
| Selected items | Choose exactly three blocks or channels created by the person. Any mixture of the two types is allowed. |

The selection interface should be small and straightforward: search by name, browse blocks/channels, see selected items and a selection count, and replace or reorder selections. Require three selections before publishing. The optional photo does not count as a selection.

The profile edit interface exposes normal fields and checkboxes; people do not need to edit YAML themselves.

### Profile display

Show the person's name, optional photo, Are.na profile link, location, intentions, local preference, and what they are looking for.

Show three separate content sections:

1. **Selected:** the three blocks or channels chosen during profile setup.
2. **Recent blocks:** the person's three most recently created blocks.
3. **Recent channels:** the person's three most recently created channels.

Recent items are fetched from their account and update automatically. They are not copied into the profile channel or recorded in its YAML. Show fewer than three when fewer are available. Display only publicly visible recent content, including when the owner views their own public profile. Exclude app-generated profile and conversation content from these recent sections.

Provide **Connect**, which opens a separate conversation screen. Do not open a chat sidebar.

### Conversations

Starting a connection lets the sender write an introduction and optionally attach existing Are.na blocks or channels. Sending creates a private channel shared by the two people, named:

```text
Connection: Maya Chen & Alex Lee
```

The conversation interface should look like a normal chat thread:

- Messages appear chronologically with sender and timestamp.
- A reply creates a new text block in the private channel.
- Pasting an Are.na block or channel URL allows the user to attach that item by connecting it into the private channel.
- Attachments render inline using the same square block/channel components as elsewhere.
- The composer supports text, attachments, or both, with a **Send** action and a minimal attachment control.
- Do not show a “Paste an Are.na link” instruction or label. The paste workflow can live behind the attachment control or in the composer.
- Subsequent visits should open the existing conversation for the pair rather than create another channel.
- Include access to the underlying channel on Are.na.
- Do not build decline, block, or acceptance flows for the initial version. Reply is the conversation action.

Private conversation channels must not belong to or grant access to the general directory group. Connecting an existing public item into a private conversation does not make its original public presence private.

## Profile storage

Each profile channel contains seven items, or eight when the person supplies a photo:

| Item | Are.na representation |
| --- | --- |
| User account | Link block pointing to their Are.na profile. |
| Who they are | Text block titled **Who are you?**. |
| What they're looking for | Separate text block titled **What you’re looking for**. |
| Attributes | Text block titled exactly **details**, containing a fenced YAML code block. |
| Selected item 1 | Existing block or channel connected into the profile channel. |
| Selected item 2 | Existing block or channel connected into the profile channel. |
| Selected item 3 | Existing block or channel connected into the profile channel. |
| Optional photo | Uploaded image block, titled with the person's name. |

Selections are actual connected items, not copies and not references stored in YAML. Account identity is represented by the actual profile link block, not an account entry in YAML.

### The details block

The title is consistently lowercase `details`. Find and update this managed block when reading or editing attributes. Its text contains a Markdown code fence, as shown below:

````markdown
```yaml
schema: connections_profile
version: 1

location:
  city: Copenhagen
  country: Denmark

open_to:
  - conversation
  - friendship
  - creative_partnership

local_only: false
```
````

Proposed stored values for `open_to` are `conversation`, `friendship`, `creative_partnership`, `romance`, and `meeting_new_people`.

Do not include country codes, showcase IDs, or account IDs in this YAML. Keep the schema name and version so future changes can be recognized and migrated.

### Metadata proposal

Use Are.na metadata to distinguish app-managed resources and connection roles without depending on item order. Suggested roles include profile link, description, details, photo, and selected item. Preserve the `details` title as the human-readable convention.

Use connection-level roles for selected items so the app does not change metadata on somebody's original shared block. Store stable resource IDs as operational references where needed, separately from the user-facing YAML. Validate profile ownership against authenticated Are.na identity and actual permissions, not editable YAML or a claimed profile URL alone.

For a message with attachments, a shared message ID on the relevant channel connections can group its text block and attachments. Display the attaching person's identity and connection timestamp for attachments rather than the original asset's creator/date. Validate metadata support and retrieval before committing to this representation.

## Group and directory ownership

The requested structure includes both a group and a main directory channel:

```text
Connections group
└── Main directory channel
    ├── Person A profile channel
    ├── Person B profile channel
    └── …

Separate private conversation channels
```

Profile channels and the main directory are owned by connections.forum (group 94185). Private conversations are individually owned, with exactly two individual participants and no group collaborator.

The operator authorizes group-owned publishing through /setup. Its OAuth credential is encrypted in the operational store. This credential creates profile channels and connects them to the directory; the person is added as an individual collaborator and uses their own token to write profile blocks. People do not need membership in the whole group. Group administrators retain their native Are.na permissions over profiles. Conversation operations always use the signed-in participant's token.

Use public visibility with restricted contributions for profiles where supported by the selected ownership model: Are.na calls this `closed`. Do not confuse it with `public`, which permits broader contributions.

The updated group URL is verified. The main directory channel is [Connections](https://www.are.na/connections-forum/connections-vtvt_rtpqq), ID 5698284, with closed visibility.

## Visual design

Match the established Are.na interface as closely as possible. Use **Arial** for now (`Arial, Helvetica, sans-serif`). Do not add Areal.

- Use the real interface and live browser inspection as the design reference. Generated screenshots are exploratory and were not accepted as exact visual specifications.
- Use a large breadcrumb-style page heading, compact controls, generous whitespace, and aligned information columns with fine horizontal rules.
- Omit the global toolbar and people-search field.
- Keep profile and conversation as separate screens.
- Every block/channel content cell is square. Captions sit outside the square; the full card including its caption need not be square.
- Keep card sizing consistent across selected items, recent blocks, and recent channels at the same viewport.
- Match native rendering separately for images, links, embeds, text, and channels. Preserve media proportions as appropriate; avoid a universal square crop.
- Channel titles and metadata are grouped centrally. Follow native visibility/theme color treatment instead of making all channels green.
- Match native borders, caption sizes, truncation, and hover controls where applicable to the app's actions.
- Follow the system light/dark appearance using prefers-color-scheme. Use the dark reference when the system is dark, and the corresponding white backgrounds, dark text and light gray fields when it is light. No separate theme selector.

See [DESIGN-REFERENCE.md](../DESIGN-REFERENCE.md) for observed measurements and source pages. Its measurements come from a 709 × 864 viewport and are not a complete responsive specification. Inspect additional viewport sizes before finalizing layout rules.

## Technical approach

- Build with Next.js and the current Are.na v3 API.
- Use Are.na OAuth for login and authorized writes. Handle token exchange and authenticated API operations on the server.
- Keep profile content, attributes, photos, messages, and attachments in Are.na.
- SQLite stores operational references, retry records, upload keys, and the encrypted directory credential. Content stays in Are.na; user OAuth sessions are encrypted HTTP-only cookies.
- Paginate content and load more on demand. Respect Are.na cache headers and rate limits rather than enumerating entire accounts.
- Keep authenticated/private responses isolated from public directory caching.
- Validate forms and safely parse the fenced YAML against its schema. Handle missing or malformed details without breaking the directory.
- Account for direct edits in Are.na, renamed or removed resources, missing attachments, expired authentication, and partial failures.
- Profile publishing spans multiple writes. Record progress and resume rather than duplicate resources on retry. Connect a completed profile into the directory only after its required content exists.
- Updating or removing a selection should disconnect it from the profile, not delete the original resource.
- Use stable user IDs to identify conversation pairs; names are for the displayed channel title. Avoid duplicate channels when retrying a send or starting an existing conversation.

### API questions to prove first

1. **Private sharing:** v3 documents private channels, but the earlier documentation review did not establish a channel collaborator mutation. Prove that two accounts can read and write the intended private channel, and that an unrelated account cannot. A separate two-person group was discussed only as a possible fallback; do not assume it or introduce an invitation workflow without resolving the product impact.
2. **Profile ownership:** verify group ownership, membership requirements, directory contribution, and who can edit profile channels.
3. **Search availability:** the reviewed v3 search endpoint is documented as Premium-only. For free accounts, investigate paginated browsing, filtering loaded items by name, and direct URL selection. Do not claim loaded-item filtering searches an entire account. Do not bulk index accounts as a workaround.
4. **Created by the person:** establish how API ownership/creator fields distinguish a person's own blocks/channels from items they have merely collected. This refers to creation within Are.na, not a claim of original authorship of external artwork.
5. **Recent items:** confirm ordering and filtering for three recent public blocks and channels, excluding app-generated content without exhaustive scanning.
6. **Photo upload:** verify the upload/create-block flow and setting the image block title to the person's name.
7. **Conversation discovery:** establish how both participants find their private channels and how attached items can be grouped with messages reliably.

API references reviewed during planning; recheck the relevant details when implementing:

- [API overview and OAuth](https://www.are.na/developers/explore)
- [Create a channel](https://www.are.na/developers/explore/channel/post-channel)
- [Connect a block or channel](https://www.are.na/developers/explore/connection/post-connection)
- [Search](https://www.are.na/developers/explore/search/search)
- [Group invitations](https://www.are.na/developers/explore/group/post-invitations)

## Implementation sequence

### 1. Verify the integration

Confirm group/directory identity, register/configure OAuth, and prove profile permissions, photo uploads, selection search, and private sharing with two test accounts. Resolve any API gaps before building dependent flows.

### 2. Establish the interface components

Implement the Arial typography, breadcrumb header, information rows, compact buttons, and native-style square block/channel renderers. Compare rendered output with Are.na at matching viewport sizes, including a narrower layout.

### 3. Build profiles and directory

Implement login, add/edit profile, optional photo, textarea, attributes form, three-item picker, preview/publish, root directory, and individual profile. Read/write the `details` block and actual channel contents. Add recent blocks and channels as live sections.

### 4. Build conversations

Implement Connect navigation, first introduction, private channel creation/access, existing-conversation lookup, chronological replies, URL attachments, and a minimal composer. Add a simple way for a signed-in user to revisit their connections without restoring the removed global toolbar.

### 5. Verify complete flows

Check login without publication; profile create/edit with and without a photo; exactly three selections; valid details YAML; directory visibility; recent item visibility; private messages and attachments from both participants; retries without duplicate content; and access denial for an unrelated account. Compare the finished screens to the live Are.na interface rather than the generated mockups.

## Outside the initial scope

- Decline, block, or accept/reject conversation flows.
- People-search field or global toolbar.
- Chat sidebar.
- Matching scores, swiping, reactions, or other unrequested social features.
- A separate content database or a custom visual identity that diverges from Are.na.

Location/intent discovery filters were discussed as a possible later enhancement, not an initial requirement.


## Implementation status — September 9, 2026

Implemented locally in Next.js: OAuth with PKCE; group-owned profile publishing and editing; actual profile link, description, details, photo and selected connections; public directory and profile screens; recent public items; private conversation discovery, access validation, replies, attachment URLs, polling and pagination. The interface uses Arial, square content cells, and separate profile/chat routes.

### Verified

- OAuth registration and read/write authorization against the live account.
- Group-owned, publicly readable closed main directory creation.
- Live item browsing, name search, and exactly-three selection behavior.
- Live private channel creation, text creation/editing, details YAML round-trip, profile-link creation, and connection metadata.
- A temporary channel shared with jk-testing had exactly two individual participants, no group owner/collaborator, and denied anonymous access. Temporary channel deletion succeeded.
- Production build and 15 automated tests covering schema validation, permissions, profile writes, private creation, message retries and sender attribution.
- Browser inspection of the profile form and its WebMCP draft-reading tool.

### Compatibility and remaining validation

Most requests use v3. Adding an individual collaborator uses the isolated, documented v2 collaborator endpoint because v3 has no equivalent write endpoint. Its behavior was verified live, but it is a compatibility dependency to revisit when Are.na exposes a replacement.

The two-account check verified the access list from the owner account. Reading and replying while authenticated as jk-testing, publishing a complete live profile, and a real photo upload still need end-to-end validation. No personal profile was published during the checks.

Premium accounts use Are.na search. Other accounts can browse pages, filter loaded items, or provide an item URL. Existing conversation discovery is paginated; importing a channel URL supports conversations not found on the first page. Recent-item sections currently filter a bounded window of 12 items, so heavy app activity can leave fewer than three visible results.

The local app uses a durable SQLite file and requires a Node host with persistent storage. Production hosting, HTTPS OAuth callback configuration, and operational backup setup remain deployment work; this build has not been deployed.


### Featured-item descriptions

Each selected block or channel has a description field. A nonempty description is saved as a separate Text block, titled with the referenced item's title, immediately after that item in channel order. Connection metadata records the referenced item type and ID so reordering and title changes preserve the association. Edits reuse description blocks; removing a description or replacing its item disconnects the old description without deleting its source. Older profiles may omit these descriptions. The profile displays featured items in a centered column with descriptions beneath them at 20px/27px, matching the supplied Retina reference.


### API request limits

Public GET responses are cached in memory according to Are.na Cache-Control (up to five minutes). Concurrent reads for the same resource/account are combined, and at most three v3 requests run at once. Authenticated responses are never reused after completion. Successful mutations invalidate public cache entries; publication visibility checks bypass cache. A 429 response starts a credential-scoped cooldown using Retry-After or X-RateLimit-Reset, exposed to the UI; chat polling respects it. Directory pages fetch eight entries to reduce cold-load request bursts. This cache and coordination are per application process and reset on restart.

Profiles are published as channels owned by the Connections group. Publishing no longer connects them to the main directory channel; the homepage reads published profile channels from the group directly. The About block is still fetched by its configured block ID.

Profile directory update: new profiles are created by and owned by the signed-in user, then connected to the group-owned Profiles channel (ARENA_PROFILES_CHANNEL / profiles_channel setting). The homepage reads that channel. Existing group-owned profiles remain editable and can be connected without changing their ownership.

Profile ownership: profile channels are owned by the Connections group, with the profile author granted collaborator access. They are connected to the group’s Profiles channel. Individual selected blocks retain their original ownership.

## Database-free retry behavior

Profiles are found by profile_user_id metadata on group-owned channels, including drafts. Messages carry a request ID and payload hash on their connections; retries scan all channel pages and add only missing parts. Conversations are found by participant pair metadata or a verified two-person access list, including partially created channels awaiting their second participant. Scan errors halt creation. In-memory locks are an optimization within one worker only. Are.na search indexing delay and simultaneous requests on different workers remain possible duplicate causes; no atomic uniqueness guarantee is claimed.

The homepage reads published, group-owned profile channels directly from the Connections group. Publishing no longer connects them to an intermediate Profiles channel; ARENA_PROFILES_CHANNEL is not required.
