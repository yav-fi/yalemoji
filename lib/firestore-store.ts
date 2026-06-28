import { FieldValue, Firestore, Timestamp } from "@google-cloud/firestore";
import { hashValue } from "./hash";
import { decideRateLimit } from "./rate-limit";
import type { PageViewStore } from "./page-view-service";
import type { WaitlistStore } from "./waitlist-service";

let firestore: Firestore | null = null;

export function getFirestore() {
  firestore ??= new Firestore(getFirestoreOptions());
  return firestore;
}

function getFirestoreOptions(): ConstructorParameters<typeof Firestore>[0] {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!credentialsJson) {
    return { projectId };
  }

  const credentials = JSON.parse(credentialsJson) as {
    client_email?: string;
    private_key?: string;
  };

  return {
    projectId,
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key?.replace(/\\n/g, "\n")
    }
  };
}

export function createFirestoreWaitlistStore(options: {
  db?: Firestore;
  salt: string;
}): WaitlistStore {
  const db = options.db ?? getFirestore();

  return {
    async submitWithRateLimit(input) {
      const emailHash = hashValue(input.email, options.salt);
      const windowStart = Math.floor(input.nowMs / input.windowMs) * input.windowMs;
      const rateLimitId = `${input.ipHash}:${windowStart}`;
      const rateLimitRef = db.collection("rateLimits").doc(rateLimitId);
      const submissionRef = db.collection("waitlistSubmissions").doc(emailHash);

      return db.runTransaction(async (transaction) => {
        const rateLimitSnapshot = await transaction.get(rateLimitRef);
        const currentCount = rateLimitSnapshot.exists
          ? Number(rateLimitSnapshot.get("count") ?? 0)
          : 0;
        const decision = decideRateLimit(currentCount, input.nowMs, input.limit, input.windowMs);

        if (!decision.allowed) {
          return { ok: false as const, retryAfterSeconds: decision.retryAfterSeconds };
        }

        transaction.set(
          rateLimitRef,
          {
            count: FieldValue.increment(1),
            ipHash: input.ipHash,
            windowStart: Timestamp.fromMillis(windowStart),
            updatedAt: FieldValue.serverTimestamp(),
            expiresAt: Timestamp.fromMillis(windowStart + input.windowMs * 2)
          },
          { merge: true }
        );

        transaction.create(
          submissionRef,
          {
            email: input.email,
            emailHash,
            createdAt: FieldValue.serverTimestamp(),
            ipHash: input.ipHash,
            userAgent: input.userAgent,
            source: input.source
          }
        );

        return { ok: true as const };
      }).catch((error: unknown) => {
        if (isAlreadyExistsError(error)) {
          return { ok: true as const };
        }
        throw error;
      });
    }
  };
}

export function createFirestorePageViewStore(options: { db?: Firestore } = {}): PageViewStore {
  const db = options.db ?? getFirestore();

  return {
    async logPageView(record) {
      await db.collection("trafficPageViews").add({
        ref: record.ref,
        ipHash: record.ipHash,
        userAgent: record.userAgent,
        path: record.path,
        createdAt: FieldValue.serverTimestamp()
      });
    }
  };
}

function isAlreadyExistsError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    ((error as { code?: number | string }).code === 6 ||
      (error as { code?: number | string }).code === "already-exists")
  );
}
