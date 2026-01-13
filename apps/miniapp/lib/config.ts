/**
 * Centralized configuration for GhostSpeak Miniapp
 *
 * All configuration values are validated at startup via lib/env.ts
 * This module provides a clean API for accessing config throughout the app.
 *
 * @module lib/config
 */

import { env, isDevelopment, isProduction } from './env'

/**
 * Application configuration object
 *
 * All values are type-safe and validated via Zod schemas.
 * Access config via this object instead of raw process.env.
 */
export const config = {
  /**
   * App URLs
   */
  appUrl: env.NEXT_PUBLIC_APP_URL,
  webAppUrl: env.NEXT_PUBLIC_WEB_APP_URL,

  /**
   * Convex backend
   */
  convexUrl: env.NEXT_PUBLIC_CONVEX_URL,

  /**
   * Solana configuration
   */
  solana: {
    rpcUrl: env.NEXT_PUBLIC_SOLANA_RPC_URL,
    network: env.NEXT_PUBLIC_SOLANA_NETWORK,
    programId: env.NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID,
    ghostTokenAddress: env.NEXT_PUBLIC_GHOST_TOKEN_ADDRESS,
  },

  /**
   * Telegram integration
   */
  telegram: {
    botUsername: env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
  },

  /**
   * Optional features
   */
  aiGateway: {
    apiKey: env.NEXT_PUBLIC_AI_GATEWAY_API_KEY,
  },

  /**
   * Environment flags
   */
  isDevelopment,
  isProduction,
  nodeEnv: env.NODE_ENV,
} as const

/**
 * API endpoint helpers - centralized URL construction
 *
 * These functions construct API endpoint URLs consistently across the app.
 * All endpoints call the main web app API.
 *
 * @example
 * ```typescript
 * import { endpoints } from '@/lib/config'
 *
 * // Get agent details
 * const url = endpoints.getAgent('4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB')
 *
 * // Send chat message
 * const chatUrl = endpoints.agentChat()
 * ```
 */
export const endpoints = {
  // ========================================
  // Agent Endpoints
  // ========================================

  /**
   * Get agent details by address
   * @param address - Solana address (32-44 chars, base58)
   * @returns Full URL for agent details endpoint
   * @example endpoints.getAgent('4wHjA2a5Y...') → "https://ghostspeak.io/api/v1/agent/4wHjA2a5Y..."
   */
  getAgent: (address: string): string => `${config.webAppUrl}/api/v1/agent/${address}`,

  /**
   * Agent chat endpoint (POST)
   * @returns Full URL for agent chat endpoint
   * @example endpoints.agentChat() → "https://ghostspeak.io/api/agent/chat"
   */
  agentChat: (): string => `${config.webAppUrl}/api/agent/chat`,

  // ========================================
  // Discovery Endpoints
  // ========================================

  /**
   * Discover agents endpoint (GET with query params)
   * @returns Full URL for agent discovery endpoint
   * @example endpoints.discoverAgents() → "https://ghostspeak.io/api/v1/discovery"
   */
  discoverAgents: (): string => `${config.webAppUrl}/api/v1/discovery`,

  // ========================================
  // Image Endpoints
  // ========================================

  /**
   * Get user images by user ID
   * @param userId - User identifier (wallet address or telegram_userId)
   * @returns Full URL for user images endpoint
   * @example endpoints.getUserImages('telegram_123456') → "https://ghostspeak.io/api/images/telegram_123456"
   */
  getUserImages: (userId: string): string => `${config.webAppUrl}/api/images/${userId}`,

  // ========================================
  // Quota Endpoints
  // ========================================

  /**
   * Get user message quota by user ID
   * @param userId - User identifier (wallet address or telegram_userId)
   * @returns Full URL for user quota endpoint
   * @example endpoints.getUserQuota('telegram_123456') → "https://ghostspeak.io/api/v1/quota?userId=telegram_123456"
   */
  getUserQuota: (userId: string): string =>
    `${config.webAppUrl}/api/v1/quota?userId=${encodeURIComponent(userId)}`,

  // ========================================
  // Health Check
  // ========================================

  /**
   * Health check endpoint
   * @returns Full URL for health check endpoint
   * @example endpoints.healthCheck() → "https://ghostspeak.io/api/v1/health"
   */
  healthCheck: (): string => `${config.webAppUrl}/api/v1/health`,
} as const

/**
 * Log configuration on startup (development only)
 */
if (isDevelopment && typeof window !== 'undefined') {
  console.log('[config] Miniapp configuration loaded:', {
    appUrl: config.appUrl,
    webAppUrl: config.webAppUrl,
    convexUrl: config.convexUrl,
    solanaNetwork: config.solana.network,
    telegramBot: config.telegram.botUsername,
  })
}
