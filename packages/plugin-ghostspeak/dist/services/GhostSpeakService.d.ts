/**
 * GhostSpeakService - Core SDK Wrapper Service for ElizaOS
 *
 * Provides a singleton service that manages the GhostSpeak SDK client lifecycle,
 * caches agent data, and exposes module accessors for blockchain operations.
 */
import { Service } from '@elizaos/core';
import type { IAgentRuntime } from '@elizaos/core';
import { GhostSpeakClient } from '@ghostspeak/sdk';
import type { Address } from '@solana/addresses';
import type { KeyPairSigner } from '@solana/signers';
/**
 * Agent account data from blockchain
 * Matches the generated Agent type from @ghostspeak/sdk
 */
interface AgentAccount {
    name: string;
    description: string;
    agentType: number;
    isActive: boolean;
    reputationScore: number;
    totalJobsCompleted: number;
    totalEarnings: bigint;
    x402Enabled: boolean;
    x402TotalCalls: bigint;
    x402TotalPayments: bigint;
    createdAt: bigint;
    metadataUri: string;
    ghostScore: bigint;
    capabilities: string[];
}
/**
 * GhostSpeak Service
 *
 * Core service for ElizaOS plugin that wraps the GhostSpeak SDK.
 * Provides:
 * - Singleton client management
 * - Lazy signer initialization
 * - Agent data caching (60s TTL)
 * - Module accessors for all SDK operations
 */
export declare class GhostSpeakService extends Service {
    protected runtime: IAgentRuntime;
    static serviceType: string;
    capabilityDescription: string;
    private client;
    private signer;
    private agentCache;
    constructor(runtime: IAgentRuntime);
    /**
     * Start the service and initialize the SDK client
     */
    static start(runtime: IAgentRuntime): Promise<GhostSpeakService>;
    /**
     * Stop the service and cleanup
     */
    stop(): Promise<void>;
    /**
     * Initialize the SDK client
     */
    private initialize;
    /**
     * Get the SDK client (throws if not initialized)
     */
    getClient(): GhostSpeakClient;
    /**
     * Get or create the signer for signing transactions
     * Lazy loads the signer on first call
     */
    getSigner(): Promise<KeyPairSigner>;
    /**
     * Check if a wallet/signer is configured
     */
    hasSigner(): boolean;
    /**
     * Get signer address without throwing (returns null if not configured)
     */
    getSignerAddress(): Address | null;
    /**
     * Get agent account with caching (60s TTL)
     */
    getAgent(agentAddress: Address): Promise<AgentAccount | null>;
    /**
     * Invalidate cached agent data
     */
    invalidateAgentCache(agentAddress: Address): void;
    /**
     * Clear all cached data
     */
    clearCache(): void;
    /**
     * Agent operations (registration, queries)
     */
    get agents(): import("@ghostspeak/sdk").AgentModule;
    /**
     * Ghost operations (external agent claiming)
     */
    get ghosts(): import("@ghostspeak/sdk").GhostModule;
    /**
     * Credential operations (W3C Verifiable Credentials)
     */
    credentials(): import("@ghostspeak/sdk").UnifiedCredentialService;
    /**
     * DID operations (Decentralized Identifiers)
     */
    did(): import("@ghostspeak/sdk").DidModule;
    /**
     * Reputation operations (Ghost Score calculation)
     */
    reputation(): import("@ghostspeak/sdk").ReputationModule;
    /**
     * Privacy operations (visibility controls)
     */
    privacy(): import("@ghostspeak/sdk").PrivacyModule;
    /**
     * Staking operations (GHOST token staking)
     * Returns StakingModule from the SDK
     */
    staking(): unknown;
    /**
     * Multi-source reputation aggregator (includes PayAI adapter for x402 payments)
     * PayAI operations are handled through the reputation module's PayAIAdapter
     */
    reputationAggregator(): any;
    /**
     * Authorization operations (trustless pre-authorization)
     * Returns AuthorizationModule from the SDK
     */
    authorization(): unknown;
    /**
     * Get the current cluster/network
     */
    getCluster(): string;
    /**
     * Check if running on mainnet
     */
    isMainnet(): boolean;
    /**
     * Get service stats for monitoring
     */
    getStats(): {
        cacheSize: number;
        hasSigner: boolean;
        cluster: string;
        isMainnet: boolean;
    };
}
export default GhostSpeakService;
//# sourceMappingURL=GhostSpeakService.d.ts.map