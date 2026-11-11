import { Storage, type Bucket } from "@google-cloud/storage";
import { getFirestoreCredentials } from "./gcp-credentials";

let storage: Storage | null = null;

function getStorageClient() {
  storage ??= new Storage(getFirestoreCredentials());
  return storage;
}

function getBucketName() {
  const bucket = process.env.YALEMOJI_ASSETS_BUCKET;
  if (!bucket) throw new Error("YALEMOJI_ASSETS_BUCKET is not configured.");
  return bucket;
}

export async function uploadAvatarAssets(
  avatarId: string,
  version: number,
  svg: string,
  png: Buffer,
  backgroundSvg: string
): Promise<{ svgUrl: string; pngUrl: string; backgroundUrl: string }> {
  const bucket = getStorageClient().bucket(getBucketName());
  const prefix = `avatars/${avatarId}/${version}`;

  const svgFile = bucket.file(`${prefix}/avatar.svg`);
  const pngFile = bucket.file(`${prefix}/avatar.png`);
  const backgroundFile = bucket.file(`${prefix}/background.svg`);

  const cacheControl = "public, max-age=31536000, immutable";

  await Promise.all([
    svgFile.save(svg, {
      contentType: "image/svg+xml",
      metadata: { cacheControl }
    }),
    pngFile.save(png, {
      contentType: "image/png",
      metadata: { cacheControl }
    }),
    backgroundFile.save(backgroundSvg, {
      contentType: "image/svg+xml",
      metadata: { cacheControl }
    })
  ]);

  return {
    svgUrl: `https://storage.googleapis.com/${bucket.name}/${prefix}/avatar.svg`,
    pngUrl: `https://storage.googleapis.com/${bucket.name}/${prefix}/avatar.png`,
    backgroundUrl: `https://storage.googleapis.com/${bucket.name}/${prefix}/background.svg`
  };
}

// Stamps a removed design's files with customTime so the bucket lifecycle rule
// (daysSinceCustomTime) deletes them after the grace period.
export async function markAvatarAssetsForDeletion(
  avatarId: string,
  version: number,
  bucket: Bucket = getStorageClient().bucket(getBucketName())
): Promise<void> {
  const prefix = `avatars/${avatarId}/${version}`;

  await Promise.all(
    ["avatar.svg", "avatar.png", "background.svg"].map(async (name) => {
      const file = bucket.file(`${prefix}/${name}`);
      try {
        const [metadata] = await file.getMetadata();
        // Cloud Storage refuses to move customTime backwards.
        if (metadata.customTime) return;
        await file.setMetadata({ customTime: new Date().toISOString() });
      } catch (error) {
        if ((error as { code?: unknown } | null)?.code === 404) return;
        throw error;
      }
    })
  );
}
