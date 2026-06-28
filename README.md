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
- `rateLimits/{ipHash}:{windowStart}` stores the hourly attempt counter and expiry metadata.
- `trafficPageViews/{autoId}` stores every page load with `ref`, IP hash, user agent, path, and timestamp. Visits without `?ref=` are stored as `none`; for example `/` logs `none`, while `/?ref=poster` logs `poster`.

Duplicate submissions return success so the API cannot be used to enumerate emails.

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
