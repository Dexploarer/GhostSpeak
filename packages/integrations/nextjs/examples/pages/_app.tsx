/**
 * Next.js App Example with GhostSpeak Integration
 * 
 * This example shows how to set up GhostSpeak in a Next.js application
 * using the provided App wrapper component.
 */

import type { AppProps } from 'next/app';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { GhostSpeakApp } from '@ghostspeak/nextjs';

// Import global styles
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <GhostSpeakApp
      network={WalletAdapterNetwork.Devnet}
      endpoint={process.env.NEXT_PUBLIC_SOLANA_RPC_URL}
      ghostspeakConfig={{
        autoConnect: true,
        debug: process.env.NODE_ENV === 'development',
        programIds: {
          marketplace: process.env.NEXT_PUBLIC_MARKETPLACE_PROGRAM_ID
        }
      }}
      walletConfig={{
        autoConnect: true
      }}
    >
      <Component {...pageProps} />
    </GhostSpeakApp>
  );
}