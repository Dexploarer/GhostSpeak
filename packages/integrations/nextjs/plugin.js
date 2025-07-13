/**
 * GhostSpeak Next.js Plugin
 * 
 * Webpack configuration plugin to optimize GhostSpeak SDK for Next.js
 */

module.exports = function withGhostSpeak(nextConfig = {}) {
  return {
    ...nextConfig,
    webpack: (config, options) => {
      // Existing webpack config
      if (typeof nextConfig.webpack === 'function') {
        config = nextConfig.webpack(config, options);
      }

      // GhostSpeak optimizations
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve.fallback,
          fs: false,
          path: false,
          crypto: false,
        },
      };

      // External dependencies that should not be bundled
      if (!options.isServer) {
        config.externals = config.externals || [];
        config.externals.push({
          'cpu-features': 'cpu-features',
        });
      }

      // Optimize for Web3.js v2
      config.module.rules.push({
        test: /\.m?js$/,
        type: 'javascript/auto',
        resolve: {
          fullySpecified: false,
        },
      });

      // Tree shaking optimization for Solana packages
      config.optimization = {
        ...config.optimization,
        sideEffects: false,
      };

      return config;
    },

    // Environment variables
    env: {
      ...nextConfig.env,
      NEXT_PUBLIC_GHOSTSPEAK_NETWORK: process.env.NEXT_PUBLIC_GHOSTSPEAK_NETWORK || 'devnet',
      NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    },

    // Experimental features for Web3 compatibility
    experimental: {
      ...nextConfig.experimental,
      esmExternals: true,
    },
  };
};