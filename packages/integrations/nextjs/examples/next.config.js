/**
 * Next.js Configuration with GhostSpeak Plugin
 */

const withGhostSpeak = require('@ghostspeak/nextjs/plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_GHOSTSPEAK_NETWORK: process.env.NEXT_PUBLIC_GHOSTSPEAK_NETWORK || 'devnet',
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID: process.env.NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID
  },

  // Transpile GhostSpeak packages
  transpilePackages: [
    '@ghostspeak/react',
    '@ghostspeak/sdk'
  ]
};

module.exports = withGhostSpeak(nextConfig);