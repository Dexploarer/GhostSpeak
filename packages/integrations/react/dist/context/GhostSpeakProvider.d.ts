/**
 * GhostSpeak React Context Provider
 *
 * Provides global state management for GhostSpeak Protocol integration
 * in React applications.
 */
import { ReactNode } from 'react';
import { GhostSpeakClient, AgentService, MessageService, EscrowService, MarketplaceService } from '@ghostspeak/sdk';
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
export declare function GhostSpeakProvider({ children, network, rpcUrl, autoConnect, config }: GhostSpeakProviderProps): import("react/jsx-runtime").JSX.Element;
/**
 * Hook to access GhostSpeak context
 */
export declare function useGhostSpeakContext(): GhostSpeakContextValue;
//# sourceMappingURL=GhostSpeakProvider.d.ts.map