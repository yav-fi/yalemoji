# y/cs Yalemoji API-key assignments

Each application has its own avatar lookup key in Google Cloud project `yalemoji`.
The table contains secret names, not credentials. CourseTable and Yalies retain
their existing keys.

All seven keys passed live API authentication checks on November 14, 2026:
an unauthenticated request returned 401, and each authenticated request returned
404 for an invalid verification NetID. No real user's avatar was accessed.

| Application | App ID / `ref` | Secret Manager secret |
| --- | --- | --- |
| CourseTable | `coursetable` | `yalemoji-coursetable-api-key` |
| Yalies | `yalies` | `yalemoji-yalies-api-key` |
| YaleMeals | `yalemeals` | `yalemoji-yalemeals-api-key` |
| ymeets | `ymeets` | `yalemoji-ymeets-api-key` |
| y/labs | `ylabs` | `yalemoji-ylabs-api-key` |
| YaleIMs | `yaleims` | `yalemoji-yaleims-api-key` |
| YaleClubs | `yaleclubs` | `yalemoji-yaleclubs-api-key` |

Retrieve the assigned key with an authorized Google Cloud account, replacing the
app ID below with the appropriate value from the table:

```sh
APP_ID=yalemeals
export YALEMOJI_API_KEY="$(gcloud secrets versions access latest \
  --project=yalemoji \
  --secret="yalemoji-${APP_ID}-api-key")"
```

Configure `YALEMOJI_API_KEY` only in that application's backend. The API origin is
`https://www.yalemoji.com`, and requests use `Authorization: Bearer <key>` with
`GET /api/v1/users/{netid}`. Use the NetID from the application's authenticated
server-side session. These credentials are avatar lookup keys, separate from
the Yalies sign-in handoff secret.

The shared integration document spells the variable `Yalemoji_API_KEY`; environment
variable names are case-sensitive. Use the exact name read by the receiving
backend. This repository and its API examples use `YALEMOJI_API_KEY`.

Only SHA-256 key hashes are registered in Firestore's `apiKeys` collection.
Plaintext copies live in Secret Manager. Creating these credentials does not
configure the receiving applications or grant their service accounts access.
