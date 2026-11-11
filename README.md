# YaleMoji

A one-page YaleMoji waitlist app built with Next.js, React, TypeScript, and a Google Cloud backend.

## Stack

- Next.js App Router with TypeScript
- Plain CSS Modules and global CSS variables
- Google Cloud Run for hosting
- Firestore Native mode for waitlist submissions, rate-limit counters, and traffic refs

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The waitlist API requires Google Cloud credentials and:

```bash
RATE_LIMIT_SALT="replace-with-a-long-random-secret"
GOOGLE_CLOUD_PROJECT="your-project-id"
```

For Vercel, also set:

```bash
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'
```

The app parses that JSON and passes the service-account credentials to Firestore. If Vercel’s env editor causes JSON formatting issues, set `GOOGLE_APPLICATION_CREDENTIALS_BASE64` instead to the base64-encoded service-account JSON. On Google Cloud Run, omit both JSON env vars and use the Cloud Run service account via Application Default Credentials.

For local API testing against Firestore, authenticate with Application Default Credentials:

```bash
gcloud auth application-default login
```

## Google Cloud Setup

1. Create or select a Google Cloud project with billing enabled.
2. Enable Firestore Native mode.
3. Create a Cloud Run service account with Firestore read/write permissions.
4. Deploy with Cloud Run using the included standalone Next.js output.
5. Set `RATE_LIMIT_SALT` as a Cloud Run secret or environment variable.

Example deployment:

```bash
gcloud run deploy yalemoji \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=your-project-id \
  --set-secrets RATE_LIMIT_SALT=yalemoji-rate-limit-salt:latest
```

## Data Model

- `waitlistSubmissions/{emailHash}` stores the normalized email, email hash, submission timestamp, IP hash, user agent, and source.
- `rateLimits/{key}:{windowStart}` stores per-window attempt counters (waitlist submissions by IP hash, avatar saves by netid, avatar reads by IP hash or API key) and expiry metadata.
- `apiKeys/{keyId}` stores API keys for other apps, by SHA-256 hash of the key: `app`, `description`, `createdAt`, `revokedAt`.
- `trafficPageViews/{autoId}` records visits to `/`, `/create`, and `/editor` with `ref`, IP hash, user agent, path, and timestamp. Known app names and aliases map to the canonical IDs in `config/yale-apps.ts` (for example `CourseTable` → `coursetable`, `Yale Menus` → `yalemeals`). Other campaign refs are preserved; missing refs are stored as `none`. Internal links and the login flow carry the normalized ref forward.
- `users/{netid}` stores login/identity metadata (`firstSeenAt`, `lastLoginAt`, set on every login) and the current avatar pointer: `avatarId` (a non-reversible id derived from the netid, used in storage paths so they don't leak netids), `avatarVersion`, `pngUrl`, `svgUrl`, `backgroundUrl`, and `updatedAt`.
- `users/{netid}/avatars/{version}` stores the full history: the canonical `config` (selections/accessories/palette/background ids) that produced that version, its asset URLs, `createdAt`, and `name` (1–60 characters; new saves are named `Untitled N`, and versions saved before names existed display as `Untitled {version}`). Users can rename a version, make any version their current avatar, or remove any version except the current one from `/designs`; removing deletes the document. Making a version current points `users/{netid}` at that version's existing files (`POST /api/designs/{version}/current`), with no re-render and no new version number.

Duplicate submissions return success so the API cannot be used to enumerate emails.

## Avatar rendering and storage

The browser never uploads image bytes. The editor (`/editor`) submits the user's *choices* — option ids for face/hair/eyes/etc, palette ids, background id — to `POST /api/avatar`. The server validates every id against the known option sets (`lib/avatar-config.ts`) and renders three files from the same source art the editor uses (`lib/avatar-render.ts`, `config/avatar-backgrounds.ts`):

- `avatar.svg` / `avatar.png` — the face only, transparent, 512×512. The background is deliberately **not** baked into these; they're the portable "who is this" asset.
- `background.svg` — the chosen background rendered as a standalone, resolution-independent SVG (`preserveAspectRatio="none"`, gradients/patterns defined so they stay coherent when stretched to any aspect ratio, not just square). This is what lets the profile UI show the same background both as a small square swatch and stretched wide across the dropdown header, with no blur or distortion either way.

All three are uploaded as **immutable, versioned** objects to Cloud Storage (`lib/avatar-storage.ts`) at `avatars/{avatarId}/{version}/{avatar.svg,avatar.png,background.svg}` with a one-year immutable `Cache-Control` header. Firestore then tracks the current version per netid (`lib/avatar-store.ts`).

An object's contents never change, but its URL is not permanent: when a user removes a design, its three files are stamped with `customTime` and a bucket lifecycle rule deletes them 14 days later (`DESIGN_ASSET_GRACE_DAYS` in `lib/designs.ts` documents the period; the bucket rule enforces it, and the two must match). **A removed design's URLs stop working 14 days after removal, so apps should fetch `png_url` from the API rather than store it long term.** The current avatar can't be removed, and the lookup APIs only ever return the current version. A user can make an older design current again, so the `version` the lookup APIs return identifies a design and can go down as well as up; don't treat it as a timeline.

Saves are rate-limited per netid (20/hour) — generous for iterative editing, but bounded.

## Using avatars in other Yale apps

Approved Yale apps can resolve a NetID (the same NetID Yalies/CAS gives us at login) to an avatar using an app API key. Every NetID lookup route requires the key; the opaque, versioned image assets remain public and cacheable.

### Displaying images

Call the JSON lookup API from your app's server, then use the returned `png_url` or `svg_url` as the browser's image source. These URLs contain an opaque ID and a revision number rather than a NetID. If the API reports no avatar, display `/assets/default-avatar.png` or `.svg`.

`GET /avatar/{netid}.svg` or `/avatar/{netid}.png` is also available as a redirect for app servers, with `Authorization: Bearer <key>` required. It shares the JSON APIs' per-key rate limit. It cannot be used directly in an `<img>` tag because image tags cannot send this header; never put API keys in URLs or browser code.

Authenticated image lookups redirect to the current asset, or to a default silhouette for a missing avatar or invalid NetID. Redirects use `Cache-Control: private, max-age=300`. Infrastructure failures return `503 server_error` with `Cache-Control: no-store` and no redirect, so an outage cannot cache a silhouette in place of an existing avatar. Authentication and rate-limit errors are also uncached. The background isn't exposed through this redirect; use `background_url` from the JSON APIs.

### JSON APIs (API key required)

Send `Authorization: Bearer <key>` (see [API keys](#api-keys)). Responses are `Cache-Control: private, max-age=300`; each key is rate-limited to 1200 requests/min.

- `GET /api/v1/users/{netid}` — `{ netid, avatar: { version, png_url, svg_url, background_url } }`, 404 if the user hasn't saved one yet.
- `GET /api/v1/users/{netid}/avatar` — just the avatar object.
- `POST /api/v1/lookup` with `{ "netids": ["abc123", "xyz9"] }` (max 100) — `{ "users": { "abc123": { version, png_url, ... }, "xyz9": null } }`. Every requested NetID (lowercased) is a key; `null` means no avatar. Use this for pages that show many people.

Errors: `401 missing_api_key` / `401 invalid_api_key`, `429 rate_limited` (with `Retry-After`).

```bash
curl -H "Authorization: Bearer $YALEMOJI_API_KEY" https://yalemoji.example/api/v1/users/abc123
curl -X POST -H "Authorization: Bearer $YALEMOJI_API_KEY" -H "Content-Type: application/json" \
  -d '{"netids":["abc123","xyz9"]}' https://yalemoji.example/api/v1/lookup
```

Call these from your app's **server**, not the browser, so the key stays secret.

### API keys

Each consuming app gets its own key so it can be revoked independently. Only the SHA-256 hash is stored (`apiKeys/{keyId}`, with `app`, `description`, `createdAt`, `revokedAt`).

```bash
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=yalemoji
npm run api-keys -- create coursetable "CourseTable prod (owner: abc123)"   # prints the key once
npm run api-keys -- list
npm run api-keys -- revoke <keyId>   # stops working within ~1 minute
```

YaleMoji never re-serves the image bytes itself — consumers load the returned URLs directly from Cloud Storage/CDN.

### One-time bucket setup

```bash
gcloud storage buckets create gs://your-bucket-name \
  --project=your-project-id \
  --uniform-bucket-level-access \
  --location=us-central1

gcloud storage buckets add-iam-policy-binding gs://your-bucket-name \
  --member=allUsers \
  --role=roles/storage.objectViewer
```

Set `YALEMOJI_ASSETS_BUCKET=your-bucket-name` and `YALEMOJI_ASSET_ID_SECRET` (see `.env.example`). The Cloud Run/Vercel service account also needs `roles/storage.objectAdmin` (or a custom role with `storage.objects.create`) on the bucket.

Removed designs' files are cleaned up by a lifecycle rule, which is a one-time operator step per bucket:

```bash
echo '{"rule":[{"action":{"type":"Delete"},"condition":{"daysSinceCustomTime":14}}]}' > lifecycle.json
gcloud storage buckets update gs://your-bucket-name --lifecycle-file=lifecycle.json
```

The rule only matches objects that have a `customTime`, which the app sets when a design is removed, so current and saved designs are never touched. Setting it needs `storage.objects.update`, which `roles/storage.objectAdmin` already includes (add it to a custom role).

## Current Google Cloud Project

This repo is configured to work with the Google Cloud project `yalemoji`:

- Display name: `YaleMoji`
- Project number: `957172655899`
- Firestore database: `(default)`
- Firestore location: `nam5`
- Firestore mode: Native
- Vercel service account: `yalemoji-vercel@yalemoji.iam.gserviceaccount.com`

## Scripts

Read-only user and avatar statistics (Application Default Credentials required):

```bash
gcloud auth application-default login # once, if not already authenticated
GOOGLE_CLOUD_PROJECT=yalemoji npm run user-stats
# Optional: export all user documents and saved avatar history to a new JSON file.
GOOGLE_CLOUD_PROJECT=yalemoji npm run user-stats -- --export /tmp/yalemoji-users.json
```

`users` counts documents in `users`, including users who have not saved an avatar.
`usersWithYalemoji` uses the same current-avatar check as the app (a version and
PNG, SVG, and background URL fields). `totalSavedVersions` counts documents in
the `avatars` collection group, including current and older saved versions.
Reserved version numbers from failed saves do not count. The export contains
NetIDs and avatar configurations; it is created with owner-only permissions and
will not overwrite an existing file. Queries run separately, so concurrent logins
or saves can cause small differences between counts while the app is active.

```bash
npm run dev
npm run test
npm run build
```
