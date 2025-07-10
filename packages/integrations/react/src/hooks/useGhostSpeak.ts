/**
 * Main GhostSpeak React Hook
 * 
 * Provides access to GhostSpeak client and services with React state management.
 */

import { useCallback, useMemo } from 'react';
import { useGhostSpeakContext } from '../context/GhostSpeakProvider';
import type { 
  GhostSpeakClient, 
  AgentService, 
  MessageService, 
  EscrowService, 
  MarketplaceService 
} from '@ghostspeak/sdk';

export interface UseGhostSpeakReturn {
  /** GhostSpeak client instance */
  client: GhostSpeakClient | null;
  /** Agent service */
  agentService: AgentService | null;
  /** Message service */
  messageService: MessageService | null;
  /** Escrow service */
  escrowService: EscrowService | null;
  /** Marketplace service */
  marketplaceService: MarketplaceService | null;
  /** Connection status */
  connected: boolean;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Current network */
  network: string;
  /** Initialize connection */
  connect: () => Promise<void>;
  /** Disconnect */
  disconnect: () => void;
  /** Check if ready for operations */
  isReady: boolean;
}

/**
 * Main hook for GhostSpeak integration
 */
export function useGhostSpeak(): UseGhostSpeakReturn {
  const {
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
  } = useGhostSpeakContext();

  const connect = useCallback(async () => {
    await initialize();
  }, [initialize]);

  const isReady = useMemo(() => {
    return connected && client !== null && !loading && error === null;
  }, [connected, client, loading, error]);

  return {
    client,
    agentService,
    messageService,
    escrowService,
    marketplaceService,
    connected,
    loading,
    error,
    network,
    connect,
    disconnect,
    isReady
  };
}