/**
 * GhostSpeak React Context Provider
 * 
 * Provides global state management for GhostSpeak Protocol integration
 * in React applications.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { 
  GhostSpeakClient, 
  AgentService, 
  MessageService, 
  EscrowService, 
  MarketplaceService 
} from '@ghostspeak/sdk';
import { Connection } from '@solana/web3.js';

export interface GhostSpeakContextValue {
  /** GhostSpeak client instance */
  client: GhostSpeakClient | null;
  /** Agent service instance */
  agentService: AgentService | null;
  /** Message service instance */
  messageService: MessageService | null;
  /** Escrow service instance */
  escrowService: EscrowService | null;
  /** Marketplace service instance */
  marketplaceService: MarketplaceService | null;
  /** Connection status */
  connected: boolean;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Network configuration */
  network: string;
  /** Initialize client manually */
  initialize: () => Promise<void>;
  /** Disconnect and cleanup */
  disconnect: () => void;
}

export interface GhostSpeakProviderProps {
  children: ReactNode;
  /** Solana network (devnet, testnet, mainnet-beta) */
  network?: string;
  /** Custom RPC URL */
  rpcUrl?: string;
  /** Auto-initialize when wallet connects */
  autoConnect?: boolean;
  /** Configuration options */
  config?: {
    /** Enable debug logging */
    debug?: boolean;
    /** Custom program IDs */
    programIds?: Record<string, string>;
    /** Connection timeout */
    timeout?: number;
  };
}

const GhostSpeakContext = createContext<GhostSpeakContextValue | null>(null);

export function GhostSpeakProvider({
  children,
  network = 'devnet',
  rpcUrl,
  autoConnect = true,
  config = {}
}: GhostSpeakProviderProps) {
  const { connection } = useConnection();
  const { wallet, connected: walletConnected, publicKey } = useWallet();

  const [client, setClient] = useState<GhostSpeakClient | null>(null);
  const [agentService, setAgentService] = useState<AgentService | null>(null);
  const [messageService, setMessageService] = useState<MessageService | null>(null);
  const [escrowService, setEscrowService] = useState<EscrowService | null>(null);
  const [marketplaceService, setMarketplaceService] = useState<MarketplaceService | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize GhostSpeak client and services
   */
  const initialize = async () => {
    if (!wallet || !publicKey) {
      setError('Wallet not connected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create GhostSpeak client
      const ghostSpeakClient = new GhostSpeakClient({
        network,
        rpcUrl: rpcUrl || connection.rpcEndpoint,
        wallet,
        ...config
      });

      // Initialize services
      const agentSvc = new AgentService(ghostSpeakClient);
      const messageSvc = new MessageService(ghostSpeakClient);
      const escrowSvc = new EscrowService(ghostSpeakClient);
      const marketplaceSvc = new MarketplaceService(ghostSpeakClient);

      // Test connection
      await ghostSpeakClient.initialize();

      // Update state
      setClient(ghostSpeakClient);
      setAgentService(agentSvc);
      setMessageService(messageSvc);
      setEscrowService(escrowSvc);
      setMarketplaceService(marketplaceSvc);
      setConnected(true);

      if (config.debug) {
        console.log('GhostSpeak client initialized successfully');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize GhostSpeak client';
      setError(errorMessage);
      console.error('GhostSpeak initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Disconnect and cleanup
   */
  const disconnect = () => {
    setClient(null);
    setAgentService(null);
    setMessageService(null);
    setEscrowService(null);
    setMarketplaceService(null);
    setConnected(false);
    setError(null);

    if (config.debug) {
      console.log('GhostSpeak client disconnected');
    }
  };

  // Auto-initialize when wallet connects
  useEffect(() => {
    if (autoConnect && walletConnected && !connected && !loading) {
      initialize();
    }
  }, [walletConnected, autoConnect, connected, loading, initialize]);

  // Disconnect when wallet disconnects
  useEffect(() => {
    if (!walletConnected && connected) {
      disconnect();
    }
  }, [walletConnected, connected, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (client) {
        disconnect();
      }
    };
  }, [client, disconnect]);

  const contextValue: GhostSpeakContextValue = {
    client,
    agentService,
    messageService,
    escrowService,
    marketplaceService,
    connected,
    loading,
    error,
    network,
    initialize,
    disconnect
  };

  return (
    <GhostSpeakContext.Provider value={contextValue}>
      {children}
    </GhostSpeakContext.Provider>
  );
}

/**
 * Hook to access GhostSpeak context
 */
export function useGhostSpeakContext(): GhostSpeakContextValue {
  const context = useContext(GhostSpeakContext);
  
  if (!context) {
    throw new Error('useGhostSpeakContext must be used within a GhostSpeakProvider');
  }

  return context;
}