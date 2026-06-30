/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Heavy/native libs must not be bundled — load at runtime. xlsx (SheetJS)
  // can break when bundled into the server build, so keep it external too.
  serverExternalPackages: ["pdf-parse", "mammoth", "xlsx"],
  experimental: {
    // Allow Server Actions when the app is reached through a proxy whose public
    // host differs from the internal one (e.g. GitHub Codespaces serves the app
    // from *.app.github.dev). Without this Next.js rejects form submissions with
    // "x-forwarded-host header does not match origin header".
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.app.github.dev", "*.github.dev"],
      // Allow larger uploads (Excel/Trello exports) than the 1 MB default.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
