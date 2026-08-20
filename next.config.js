/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["@napi-rs/canvas", "@google-cloud/storage"]
};

module.exports = nextConfig;
