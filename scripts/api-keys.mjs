#!/usr/bin/env node
// Issue, list, and revoke API keys for apps that read Yalemoji avatars.
//
//   npm run api-keys -- create <app> "<description>"
//   npm run api-keys -- list
//   npm run api-keys -- revoke <keyId>
//
// Uses Application Default Credentials (`gcloud auth application-default login`)
// and GOOGLE_CLOUD_PROJECT. The plaintext key is printed once, on create, and
// never stored; Firestore only holds its SHA-256 hash (the keyId).
//
// Keep this hashing/format in sync with lib/api-keys.ts.

import { createHash, randomBytes } from "node:crypto";
import { Firestore, FieldValue } from "@google-cloud/firestore";

const COLLECTION = "apiKeys";
const APP_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

function usage(message) {
  if (message) console.error(`Error: ${message}\n`);
  console.error(
    [
      "Usage:",
      '  npm run api-keys -- create <app> "<description>"',
      "  npm run api-keys -- list",
      "  npm run api-keys -- revoke <keyId>"
    ].join("\n")
  );
  process.exit(1);
}

const [command, ...args] = process.argv.slice(2);
const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
if (!projectId) usage("set GOOGLE_CLOUD_PROJECT (e.g. GOOGLE_CLOUD_PROJECT=yalemoji)");
const db = new Firestore({ projectId });

if (command === "create") {
  const [app, description] = args;
  if (!app || !APP_PATTERN.test(app)) {
    usage("app must be lowercase letters, digits, or dashes (e.g. coursetable)");
  }
  if (!description) usage("a description is required (who owns this key and why)");

  const key = `ymk_${randomBytes(32).toString("base64url")}`;
  const keyId = createHash("sha256").update(key).digest("hex");
  await db.collection(COLLECTION).doc(keyId).create({
    app,
    description,
    createdAt: FieldValue.serverTimestamp(),
    revokedAt: null
  });

  console.log(`Created key for "${app}" (keyId ${keyId}).`);
  console.log("Copy it now; it will not be shown again:\n");
  console.log(`  ${key}\n`);
} else if (command === "list") {
  const snapshot = await db.collection(COLLECTION).orderBy("createdAt").get();
  if (snapshot.empty) console.log("No API keys.");
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const status = data.revokedAt ? "REVOKED" : "active ";
    const created = data.createdAt?.toDate?.().toISOString() ?? "?";
    console.log(`${status}  ${doc.id}  ${data.app}  ${created}  ${data.description}`);
  }
} else if (command === "revoke") {
  const [keyId] = args;
  if (!keyId || !/^[0-9a-f]{64}$/.test(keyId)) usage("pass the 64-character keyId from `list`");

  const ref = db.collection(COLLECTION).doc(keyId);
  const snapshot = await ref.get();
  if (!snapshot.exists) usage(`no key with keyId ${keyId}`);
  await ref.update({ revokedAt: FieldValue.serverTimestamp() });
  console.log(`Revoked ${keyId} (${snapshot.get("app")}). It stops working within a minute.`);
} else {
  usage(command ? `unknown command "${command}"` : undefined);
}
