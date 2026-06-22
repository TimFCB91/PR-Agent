/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Allow Server Actions when the app is reached through a proxy whose public
    // host differs from the internal one (e.g. GitHub Codespaces serves the app
    // from *.app.github.dev). Without this Next.js rejects form submissions with
    // "x-forwarded-host header does not match origin header".
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.app.github.dev", "*.github.dev"],
    },
  },
};

export default nextConfig;
