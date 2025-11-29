import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  // Enable static export for GitHub Pages
  output: 'export',

  // Disable TypeScript checking during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },

  // Set basePath for GitHub Pages (uncomment if deploying to subdirectory)
  // basePath: process.env.NODE_ENV === 'production' ? '/ghostspeak' : '',

  // Configure asset prefix for GitHub Pages
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/ghostspeak/' : '',

  // Add webpack aliases for stub modules
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@solana/wallet-adapter-react': path.resolve(__dirname, 'lib/stubs/wallet-adapter-react.tsx'),
      '@solana/wallet-adapter-react-ui': path.resolve(__dirname, 'lib/stubs/wallet-adapter-react.tsx'),
    }
    return config
  },
}

export default nextConfig
