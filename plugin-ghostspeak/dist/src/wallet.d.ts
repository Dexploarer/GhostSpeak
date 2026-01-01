/**
 * Wallet/Signer Management for GhostSpeak Plugin
 *
 * Provides wallet and signer functionality for ElizaOS agents to:
 * - Register agents on-chain
 * - Issue verifiable credentials
 * - Sign transactions
 * - Manage keys securely
 */
import type { IAgentRuntime } from '@elizaos/core';
import type { KeyPairSigner } from '@solana/signers';
import type { Address } from '@solana/addresses';
/**
 * Wallet configuration for an agent
 */
export interface AgentWallet {
    publicKey: Address;
    privateKey?: Uint8Array;
    address: Address;
}
/**
 * Get agent signer from runtime or environment
 *
 * Priority order:
 * 1. runtime.wallet (if agent has wallet configured)
 * 2. AGENT_WALLET_PRIVATE_KEY environment variable
 * 3. Generate new keypair (dev mode only)
 *
 * @param runtime - ElizaOS agent runtime
 * @param allowGenerate - Whether to generate new keypair if none found (default: false)
 * @returns KeyPairSigner for signing transactions
 */
export declare function getAgentSigner(runtime: IAgentRuntime, allowGenerate?: boolean): Promise<KeyPairSigner>;
/**
 * Validate that an agent has a wallet configured
 *
 * @param runtime - ElizaOS agent runtime
 * @returns true if wallet is configured
 */
export declare function hasWalletConfigured(runtime: IAgentRuntime): boolean;
/**
 * Get agent's public address without loading full signer
 *
 * Useful for read-only operations that don't need signing
 *
 * @param runtime - ElizaOS agent runtime
 * @returns Agent's Solana address
 */
export declare function getAgentAddress(runtime: IAgentRuntime): Promise<Address>;
/**
 * Airdrop SOL to agent wallet (devnet only)
 *
 * Used for funding agent wallets for transaction fees
 *
 * @param runtime - ElizaOS agent runtime
 * @param amount - Amount of SOL to airdrop (default: 1 SOL)
 * @returns Transaction signature
 */
export declare function airdropToAgent(runtime: IAgentRuntime, amount?: number): Promise<string>;
/**
 * Get SOL balance for agent wallet
 *
 * @param runtime - ElizaOS agent runtime
 * @returns Balance in lamports
 */
export declare function getAgentBalance(runtime: IAgentRuntime): Promise<bigint>;
/**
 * Format balance from lamports to SOL
 *
 * @param lamports - Balance in lamports
 * @returns Formatted SOL amount
 */
export declare function formatSolBalance(lamports: bigint): string;
/**
 * Ensure agent has minimum SOL balance for transactions
 *
 * Auto-airdrops on devnet if balance is below threshold
 *
 * @param runtime - ElizaOS agent runtime
 * @param minBalance - Minimum balance in lamports (default: 0.1 SOL)
 * @returns true if balance is sufficient
 */
export declare function ensureFundedWallet(runtime: IAgentRuntime, minBalance?: number): Promise<boolean>;
/**
 * Export public key for sharing/display
 *
 * @param runtime - ElizaOS agent runtime
 * @returns Base58-encoded public key
 */
export declare function exportPublicKey(runtime: IAgentRuntime): Promise<string>;
//# sourceMappingURL=wallet.d.ts.map