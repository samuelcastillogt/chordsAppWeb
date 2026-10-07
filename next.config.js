/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker image. The GitHub Pages workflow switches this to a static export at build time.
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
}

module.exports = nextConfig
