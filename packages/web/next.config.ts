import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  // Note: Static export disabled - this is a dynamic web3 app with wallet connections
  // and real-time blockchain data that requires client-side rendering

  // Disable TypeScript checking during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },

  // Set basePath for GitHub Pages (uncomment if deploying to subdirectory)
  // basePath: process.env.NODE_ENV === 'production' ? '/ghostspeak' : '',

  // Configure asset prefix for GitHub Pages
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/ghostspeak/' : '',

  // Configure asset prefix for GitHub Pages
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/ghostspeak/' : '',
}

export default nextConfig
