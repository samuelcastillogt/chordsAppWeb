/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_API_URL: 'https://chords-api-python.vercel.app'
  },
}

module.exports = nextConfig
