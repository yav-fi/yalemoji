import { Storage } from "@google-cloud/storage";
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
  png: Buffer
): Promise<{ svgUrl: string; pngUrl: string }> {
  const bucket = getStorageClient().bucket(getBucketName());
  const prefix = `avatars/${avatarId}/${version}`;

  const svgFile = bucket.file(`${prefix}/avatar.svg`);
  const pngFile = bucket.file(`${prefix}/avatar.png`);

  const cacheControl = "public, max-age=31536000, immutable";

  await Promise.all([
    svgFile.save(svg, {
      contentType: "image/svg+xml",
      metadata: { cacheControl }
    }),
    pngFile.save(png, {
      contentType: "image/png",
      metadata: { cacheControl }
    })
  ]);

  return {
    svgUrl: `https://storage.googleapis.com/${bucket.name}/${prefix}/avatar.svg`,
    pngUrl: `https://storage.googleapis.com/${bucket.name}/${prefix}/avatar.png`
  };
}
