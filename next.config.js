/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker image. The GitHub Pages workflow switches this to a static export at build time.
  output: "standalone",
  reactStrictMode: true,
  // Static export writes /explorer/index.html, so GitHub Pages serves both /explorer and /explorer/.
  trailingSlash: true,
  poweredByHeader: false,
}

module.exports = nextConfig
