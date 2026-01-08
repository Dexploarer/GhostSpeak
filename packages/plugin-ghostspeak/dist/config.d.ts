/**
 * GhostSpeak Plugin Configuration Schema
 *
 * Defines all environment variables and configuration options
 * for the GhostSpeak ElizaOS plugin.
 */
import { z } from 'zod';
/**
 * Configuration schema with validation
 */
export declare const ghostspeakConfigSchema: z.ZodObject<{
    /**
     * Agent wallet private key for signing transactions
     * Supports formats: Base58, Hex (0x...), JSON array [1,2,3...]
     * Required for write operations (registration, credentials, staking)
     */
    AGENT_WALLET_PRIVATE_KEY: z.ZodOptional<z.ZodString>;
    /**
     * Solana cluster to connect to
     * Default: devnet
     */
    SOLANA_CLUSTER: z.ZodDefault<z.ZodOptional<z.ZodEnum<["devnet", "mainnet-beta", "testnet"]>>>;
    /**
     * Custom RPC endpoint URL
     * Overrides default cluster endpoint
     */
    SOLANA_RPC_URL: z.ZodOptional<z.ZodString>;
    /**
     * Crossmint API secret key for EVM credential bridging
     */
    CROSSMINT_SECRET_KEY: z.ZodOptional<z.ZodString>;
    /**
     * Crossmint template ID for reputation credentials
     */
    CROSSMINT_REPUTATION_TEMPLATE_ID: z.ZodOptional<z.ZodString>;
    /**
     * Crossmint environment
     */
    CROSSMINT_ENV: z.ZodOptional<z.ZodEnum<["staging", "production"]>>;
    /**
     * EVM chain for Crossmint credentials
     */
    CROSSMINT_CHAIN: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    /**
     * Staking config account address (set by protocol)
     */
    STAKING_CONFIG_ADDRESS: z.ZodOptional<z.ZodString>;
    /**
     * GHOST token mint address
     */
    GHOST_TOKEN_MINT: z.ZodOptional<z.ZodString>;
    /**
     * Token mint for escrow (default: SOL)
     */
    ESCROW_TOKEN_MINT: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    /**
     * Merchant address to receive payments
     * This is the Solana address that will receive USDC payments
     */
    GHOSTSPEAK_MERCHANT_ADDRESS: z.ZodOptional<z.ZodString>;
    /**
     * PayAI facilitator URL
     * Default: https://facilitator.payai.network
     */
    PAYAI_FACILITATOR_URL: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    AGENT_WALLET_PRIVATE_KEY?: string;
    SOLANA_CLUSTER?: "devnet" | "mainnet-beta" | "testnet";
    SOLANA_RPC_URL?: string;
    CROSSMINT_SECRET_KEY?: string;
    CROSSMINT_REPUTATION_TEMPLATE_ID?: string;
    CROSSMINT_ENV?: "staging" | "production";
    CROSSMINT_CHAIN?: string;
    STAKING_CONFIG_ADDRESS?: string;
    GHOST_TOKEN_MINT?: string;
    ESCROW_TOKEN_MINT?: string;
    GHOSTSPEAK_MERCHANT_ADDRESS?: string;
    PAYAI_FACILITATOR_URL?: string;
}, {
    AGENT_WALLET_PRIVATE_KEY?: string;
    SOLANA_CLUSTER?: "devnet" | "mainnet-beta" | "testnet";
    SOLANA_RPC_URL?: string;
    CROSSMINT_SECRET_KEY?: string;
    CROSSMINT_REPUTATION_TEMPLATE_ID?: string;
    CROSSMINT_ENV?: "staging" | "production";
    CROSSMINT_CHAIN?: string;
    STAKING_CONFIG_ADDRESS?: string;
    GHOST_TOKEN_MINT?: string;
    ESCROW_TOKEN_MINT?: string;
    GHOSTSPEAK_MERCHANT_ADDRESS?: string;
    PAYAI_FACILITATOR_URL?: string;
}>;
/**
 * Inferred TypeScript type from schema
 */
export type GhostSpeakPluginConfig = z.infer<typeof ghostspeakConfigSchema>;
/**
 * Validate and parse configuration
 */
export declare function parseConfig(config: Record<string, string | undefined>): GhostSpeakPluginConfig;
/**
 * Safe config parsing that doesn't throw
 */
export declare function safeParseConfig(config: Record<string, string | undefined>): {
    success: boolean;
    data?: GhostSpeakPluginConfig;
    error?: z.ZodError;
};
/**
 * Get config from environment
 */
export declare function getConfigFromEnv(): GhostSpeakPluginConfig;
export default ghostspeakConfigSchema;
//# sourceMappingURL=config.d.ts.map