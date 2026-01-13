/**
 * Type-safe environment variable validation for GhostSpeak Miniapp
 *
 * This module uses Zod to validate all environment variables at startup,
 * ensuring the app fails fast with clear error messages if misconfigured.
 *
 * @module lib/env
 * @see {@link https://zod.dev} Zod documentation
 */

import { z } from 'zod'

/**
 * Zod schema for all required and optional environment variables
 *
 * All NEXT_PUBLIC_* variables are exposed to the browser.
 * Server-only variables should NOT have the NEXT_PUBLIC_ prefix.
 */
const envSchema = z.object({
  // ============================================================================
  // App URLs
  // ============================================================================

  /**
   * URL of the miniapp itself
   * @example "http://localhost:3334" (development)
   * @example "https://miniapp.ghostspeak.io" (production)
   */
  NEXT_PUBLIC_APP_URL: z.string().url(),

  /**
   * URL of the main web app (for API calls)
   * @example "http://localhost:3333" (development)
   * @example "https://ghostspeak.io" (production)
   */
  NEXT_PUBLIC_WEB_APP_URL: z.string().url(),

  // ============================================================================
  // Convex Backend
  // ============================================================================

  /**
   * Convex deployment URL
   * @example "https://lovely-cobra-639.convex.cloud" (development)
   * @example "https://enduring-porpoise-79.convex.cloud" (production)
   */
  NEXT_PUBLIC_CONVEX_URL: z.string().url(),

  // ============================================================================
  // Solana Configuration
  // ============================================================================

  /**
   * Solana RPC endpoint URL
   * @example "https://api.devnet.solana.com" (devnet)
   * @example "https://api.mainnet-beta.solana.com" (mainnet)
   */
  NEXT_PUBLIC_SOLANA_RPC_URL: z.string().url(),

  /**
   * Solana network environment
   */
  NEXT_PUBLIC_SOLANA_NETWORK: z.enum(['devnet', 'testnet', 'mainnet-beta']),

  /**
   * GhostSpeak program ID (base58 encoded public key, 32-44 chars)
   */
  NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID: z.string().min(32).max(44),

  /**
   * GHOST token mint address (base58 encoded public key, 32-44 chars)
   */
  NEXT_PUBLIC_GHOST_TOKEN_ADDRESS: z.string().min(32).max(44),

  // ============================================================================
  // Telegram Integration
  // ============================================================================

  /**
   * Telegram bot username (without @)
   * @example "boo_gs_bot"
   */
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z.string().min(3),

  // ============================================================================
  // Optional Variables
  // ============================================================================

  /**
   * AI Gateway API key (optional for development)
   */
  NEXT_PUBLIC_AI_GATEWAY_API_KEY: z.string().optional(),

  /**
   * Node environment
   */
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
})

/**
 * Validated and typed environment object
 *
 * This will throw a clear Zod validation error if any required variable
 * is missing or invalid, preventing the app from starting with bad config.
 *
 * @throws {z.ZodError} If environment validation fails
 */
export const env = envSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_WEB_APP_URL: process.env.NEXT_PUBLIC_WEB_APP_URL,
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK,
  NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID: process.env.NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID,
  NEXT_PUBLIC_GHOST_TOKEN_ADDRESS: process.env.NEXT_PUBLIC_GHOST_TOKEN_ADDRESS,
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
  NEXT_PUBLIC_AI_GATEWAY_API_KEY: process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY,
  NODE_ENV: process.env.NODE_ENV,
})

/**
 * TypeScript type inferred from the Zod schema
 *
 * Use this for type-safe access to environment variables throughout the app.
 */
export type Env = z.infer<typeof envSchema>

/**
 * Helper to check if we're in development mode
 */
export const isDevelopment = env.NODE_ENV === 'development'

/**
 * Helper to check if we're in production mode
 */
export const isProduction = env.NODE_ENV === 'production'
