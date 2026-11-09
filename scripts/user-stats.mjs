#!/usr/bin/env node
// Read-only user/avatar statistics, with an optional JSON export.
// Uses Application Default Credentials, like scripts/api-keys.mjs.
import { writeFile } from "node:fs/promises";
import { Firestore } from "@google-cloud/firestore";

const args = process.argv.slice(2);
const usage = "Usage: npm run user-stats -- [--export /path/to/users.json]";
if (args.length === 1 && args[0] === "--help") {
  console.log(usage);
  process.exit(0);
}
if (args.length && (args.length !== 2 || args[0] !== "--export" || !args[1])) {
  console.error(usage);
  process.exit(1);
}

const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
if (!projectId) {
  console.error("Set GOOGLE_CLOUD_PROJECT (e.g. GOOGLE_CLOUD_PROJECT=yalemoji).");
  process.exit(1);
}

const exportPath = args[1];
const db = new Firestore({ projectId });
try {
  const usersQuery = db.collection("users");
  const historyQuery = db.collectionGroup("avatars");
  const [users, history] = await Promise.all([
    (exportPath
      ? usersQuery
      : usersQuery.select("avatarVersion", "pngUrl", "svgUrl", "backgroundUrl")
    ).get(),
    exportPath ? historyQuery.get() : historyQuery.count().get()
  ]);

  // Match lib/avatar-store.ts's current-avatar validity check.
  const withAvatar = users.docs.filter(
    (doc) =>
      Boolean(Number(doc.get("avatarVersion") ?? 0)) &&
      ["pngUrl", "svgUrl", "backgroundUrl"].every(
        (field) => typeof doc.get(field) === "string"
      )
  ).length;
  const stats = {
    project: projectId,
    database: "(default)",
    queriedAt: new Date().toISOString(),
    users: users.size,
    usersWithYalemoji: withAvatar,
    usersWithoutYalemoji: users.size - withAvatar,
    // Includes current and older saved versions, never reserved/failed saves.
    totalSavedVersions: exportPath ? history.size : history.data().count
  };

  if (exportPath) {
    await writeFile(
      exportPath,
      JSON.stringify(
        {
          stats,
          users: users.docs.map((doc) => ({ path: doc.ref.path, data: doc.data() })),
          avatarHistory: history.docs.map((doc) => ({ path: doc.ref.path, data: doc.data() }))
        },
        null,
        2
      ) + "\n",
      { flag: "wx", mode: 0o600 }
    );
  }
  console.log(JSON.stringify(stats, null, 2));
  if (exportPath) console.log(`Exported users and avatar history to ${exportPath}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.terminate();
}
