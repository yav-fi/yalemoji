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
- `rateLimits/{key}:{windowStart}` stores per-window attempt counters (waitlist submissions by IP hash, avatar saves by netid, avatar reads by IP hash) and expiry metadata.
- `trafficPageViews/{autoId}` stores every page load with `ref`, IP hash, user agent, path, and timestamp. Visits without `?ref=` are stored as `none`; for example `/` logs `none`, while `/?ref=poster` logs `poster`.
- `users/{netid}` stores the current avatar pointer: `avatarId` (a non-reversible id derived from the netid, used in storage paths so they don't leak netids), `avatarVersion`, `pngUrl`, `svgUrl`, and `updatedAt`.
- `users/{netid}/avatars/{version}` stores the full history: the canonical `config` (selections/accessories/palette/background ids) that produced that version, its asset URLs, and `createdAt`.

Duplicate submissions return success so the API cannot be used to enumerate emails.

## Avatar rendering and storage

The browser never uploads image bytes. The editor (`/editor`) submits the user's *choices* — option ids for face/hair/eyes/etc, palette ids, background id — to `POST /api/avatar`. The server validates every id against the known option sets (`lib/avatar-config.ts`), re-renders the SVG and a 512×512 PNG from the same source art the editor uses (`lib/avatar-render.ts`), and uploads both as **immutable, versioned** objects to Cloud Storage (`lib/avatar-storage.ts`) at `avatars/{avatarId}/{version}/avatar.{svg,png}` with a one-year immutable `Cache-Control` header. Firestore then tracks the current version per netid (`lib/avatar-store.ts`).

Saves are rate-limited per netid (20/hour) — generous for iterative editing, but bounded.

Other Yale apps can consume a user's avatar without any YaleMoji-specific integration:

- `GET /api/v1/users/{netid}` — `{ netid, avatar: { version, png_url, svg_url } }`, 404 if the user hasn't saved one yet. Cached 5 minutes.
- `GET /api/v1/users/{netid}/avatar` — just the avatar object.
- `GET /avatar/{netid}.svg` or `/avatar/{netid}.png` — 302s straight to the current immutable asset, so `<img src="https://yalemoji.example/avatar/yaf23.svg">` works with zero API integration.

These read endpoints are unauthenticated and rate-limited per IP (300/min) since they're meant for programmatic consumption. YaleMoji never re-serves the image bytes itself — consumers load the returned `png_url`/`svg_url` directly from Cloud Storage/CDN.

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

## Current Google Cloud Project

This repo is configured to work with the Google Cloud project `yalemoji`:

- Display name: `YaleMoji`
- Project number: `957172655899`
- Firestore database: `(default)`
- Firestore location: `nam5`
- Firestore mode: Native
- Vercel service account: `yalemoji-vercel@yalemoji.iam.gserviceaccount.com`

## Scripts

```bash
npm run dev
npm run test
npm run build
```
