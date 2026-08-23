/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["@napi-rs/canvas", "@google-cloud/storage"],
  // lib/avatar-render.ts reads layer SVGs from public/yalemoji at runtime using
  // a dynamically-computed path, which Next's automatic file tracing can't
  // detect. Without this, serverless deploys (e.g. Vercel) can drop those
  // files from the function bundle and every save fails with ENOENT.
  outputFileTracingIncludes: {
    "/api/avatar": ["./public/yalemoji/**/*"]
  }
};

module.exports = nextConfig;
