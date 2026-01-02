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
export const ghostspeakConfigSchema = z.object({
  // =====================================================
  // WALLET CONFIGURATION
  // =====================================================

  /**
   * Agent wallet private key for signing transactions
   * Supports formats: Base58, Hex (0x...), JSON array [1,2,3...]
   * Required for write operations (registration, credentials, staking)
   */
  AGENT_WALLET_PRIVATE_KEY: z
    .string()
    .optional()
    .describe('Agent wallet private key (base58, hex, or JSON array format)'),

  // =====================================================
  // NETWORK CONFIGURATION
  // =====================================================

  /**
   * Solana cluster to connect to
   * Default: devnet
   */
  SOLANA_CLUSTER: z
    .enum(['devnet', 'mainnet-beta', 'testnet'])
    .optional()
    .default('devnet')
    .describe('Solana cluster (devnet, mainnet-beta, testnet)'),

  /**
   * Custom RPC endpoint URL
   * Overrides default cluster endpoint
   */
  SOLANA_RPC_URL: z
    .string()
    .url()
    .optional()
    .describe('Custom Solana RPC endpoint URL'),

  // =====================================================
  // CROSSMINT CONFIGURATION (Credential Bridging)
  // =====================================================

  /**
   * Crossmint API secret key for EVM credential bridging
   */
  CROSSMINT_SECRET_KEY: z
    .string()
    .optional()
    .describe('Crossmint API secret key for credential bridging'),

  /**
   * Crossmint template ID for reputation credentials
   */
  CROSSMINT_REPUTATION_TEMPLATE_ID: z
    .string()
    .optional()
    .describe('Crossmint template ID for reputation credentials'),

  /**
   * Crossmint environment
   */
  CROSSMINT_ENV: z
    .enum(['staging', 'production'])
    .optional()
    .describe('Crossmint environment (staging or production)'),

  /**
   * EVM chain for Crossmint credentials
   */
  CROSSMINT_CHAIN: z
    .string()
    .optional()
    .default('base-sepolia')
    .describe('EVM chain for Crossmint (e.g., base-sepolia, polygon)'),

  // =====================================================
  // STAKING CONFIGURATION
  // =====================================================

  /**
   * Staking config account address (set by protocol)
   */
  STAKING_CONFIG_ADDRESS: z
    .string()
    .optional()
    .describe('Staking configuration account address'),

  /**
   * GHOST token mint address
   */
  GHOST_TOKEN_MINT: z
    .string()
    .optional()
    .describe('GHOST token mint address'),

  // =====================================================
  // ESCROW CONFIGURATION
  // =====================================================

  /**
   * Token mint for escrow (default: SOL)
   */
  ESCROW_TOKEN_MINT: z
    .string()
    .optional()
    .default('So11111111111111111111111111111111111111112')
    .describe('Token mint for escrow operations (default: Native SOL)'),
});

/**
 * Inferred TypeScript type from schema
 */
export type GhostSpeakPluginConfig = z.infer<typeof ghostspeakConfigSchema>;

/**
 * Validate and parse configuration
 */
export function parseConfig(config: Record<string, string | undefined>): GhostSpeakPluginConfig {
  return ghostspeakConfigSchema.parse(config);
}

/**
 * Safe config parsing that doesn't throw
 */
export function safeParseConfig(config: Record<string, string | undefined>): {
  success: boolean;
  data?: GhostSpeakPluginConfig;
  error?: z.ZodError;
} {
  const result = ghostspeakConfigSchema.safeParse(config);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Get config from environment
 */
export function getConfigFromEnv(): GhostSpeakPluginConfig {
  return ghostspeakConfigSchema.parse({
    AGENT_WALLET_PRIVATE_KEY: process.env.AGENT_WALLET_PRIVATE_KEY,
    SOLANA_CLUSTER: process.env.SOLANA_CLUSTER,
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
    CROSSMINT_SECRET_KEY: process.env.CROSSMINT_SECRET_KEY,
    CROSSMINT_REPUTATION_TEMPLATE_ID: process.env.CROSSMINT_REPUTATION_TEMPLATE_ID,
    CROSSMINT_ENV: process.env.CROSSMINT_ENV,
    CROSSMINT_CHAIN: process.env.CROSSMINT_CHAIN,
    STAKING_CONFIG_ADDRESS: process.env.STAKING_CONFIG_ADDRESS,
    GHOST_TOKEN_MINT: process.env.GHOST_TOKEN_MINT,
    ESCROW_TOKEN_MINT: process.env.ESCROW_TOKEN_MINT,
  });
}

export default ghostspeakConfigSchema;
