/**
 * GhostSpeak Next.js App Component
 * 
 * Pre-configured app wrapper that sets up all necessary providers
 * and optimizations for Next.js applications.
 */

import React, { ReactNode, useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { GhostSpeakProvider } from '@ghostspeak/react';

// Import CSS only on client side to avoid SSR issues
if (typeof window !== 'undefined') {
  import('@solana/wallet-adapter-react-ui/styles.css');
}

export interface GhostSpeakAppProps {
  children: ReactNode;
  /** Solana network */
  network?: WalletAdapterNetwork;
  /** Custom RPC endpoint */
  endpoint?: string;
  /** GhostSpeak configuration */
  ghostspeakConfig?: {
    autoConnect?: boolean;
    debug?: boolean;
    programIds?: Record<string, string>;
  };
  /** Wallet configuration */
  walletConfig?: {
    wallets?: any[];
    autoConnect?: boolean;
  };
}

export function GhostSpeakApp({
  children,
  network = WalletAdapterNetwork.Devnet,
  endpoint,
  ghostspeakConfig = {},
  walletConfig = {}
}: GhostSpeakAppProps) {
  // Determine endpoint
  const rpcEndpoint = useMemo(() => {
    if (endpoint) return endpoint;
    
    // Use environment variable if available
    if (typeof window === 'undefined') {
      return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network);
    }
    
    return (
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_SOLANA_RPC_URL ||
      clusterApiUrl(network)
    );
  }, [endpoint, network]);

  // Configure wallets
  const wallets = useMemo(() => {
    if (walletConfig.wallets) {
      return walletConfig.wallets;
    }

    return [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new TorusWalletAdapter()
    ];
  }, [network, walletConfig.wallets]);

  return (
    <ConnectionProvider endpoint={rpcEndpoint}>
      <WalletProvider 
        wallets={wallets} 
        autoConnect={walletConfig.autoConnect ?? true}
      >
        <WalletModalProvider>
          <GhostSpeakProvider
            network={network}
            rpcUrl={rpcEndpoint}
            autoConnect={ghostspeakConfig.autoConnect ?? true}
            config={{
              debug: ghostspeakConfig.debug ?? false,
              programIds: ghostspeakConfig.programIds,
              ...ghostspeakConfig
            }}
          >
            {children}
          </GhostSpeakProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default GhostSpeakApp;