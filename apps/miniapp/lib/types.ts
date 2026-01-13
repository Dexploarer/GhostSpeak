/**
 * Type definitions for GhostSpeak Mini App API
 *
 * This module defines all API request/response types and custom error classes.
 * All types are aligned with the main web app API contracts.
 *
 * @module lib/types
 */

// ============================================================================
// Agent Types
// ============================================================================

/**
 * Agent information from discovery API
 */
export interface AgentInfo {
  address: string
  name: string
  verified: boolean
  ghostScore: number
  credentials: number
  endpoint?: string
}

/**
 * Agent discovery query parameters
 */
export interface AgentDiscoveryParams {
  address?: string
  verified?: boolean
  limit?: number
}

/**
 * Agent discovery API response
 */
export interface AgentDiscoveryResponse {
  agents: AgentInfo[]
}

/**
 * Agent details API response
 */
export interface AgentDetailsResponse {
  agent: {
    address: string
    status: string
    discovery: {
      source: string
      firstSeenTimestamp: number
      slot: number
      blockTime?: number
      firstTxSignature?: string
      facilitatorAddress?: string
    }
    ownership: {
      claimedBy?: string
      claimedAt?: number
    }
    metadata: {
      ipfsCid?: string
      ipfsUri?: string
      fileId?: string
    }
    externalIds: Array<{
      platform: string
      externalId: string
      verified: boolean
      verifiedAt?: number
    }>
  }
  timestamp: number
}

// ============================================================================
// Ghost Score Types
// ============================================================================

/**
 * Ghost Score data structure
 */
export interface GhostScoreData {
  score: number
  factors: {
    transactionVolume: number
    successRate: number
    averageResponseTime: number
    uptime: number
  }
  history: Array<{
    date: string
    score: number
  }>
}

// ============================================================================
// Image Generation Types
// ============================================================================

/**
 * User image data structure
 */
export interface UserImage {
  _id: string
  storageUrl: string
  prompt: string
  templateId?: string
  createdAt: number
  upvotes: number
  downvotes: number
}

/**
 * Image generation request parameters
 */
export interface GenerateImageParams {
  userId: string
  message: string
  characterId: 'boo' | 'caisper'
  source?: 'web' | 'telegram'
  prompt?: string
  template?: string
}

/**
 * Image generation API response (success)
 */
export interface GenerateImageResponse {
  success: boolean
  imageUrl?: string
  message: string
  metadata?: {
    imageUrl?: string
    prompt?: string
    templateId?: string
    generationTime?: number
    ui?: {
      imageUrl?: string
    }
  }
}

// ============================================================================
// Text Generation Types
// ============================================================================

/**
 * Thread template types
 */
export type ThreadTemplate = 'raid' | 'announcement' | 'educational' | 'product' | 'community' | 'alpha'

/**
 * Post template types
 */
export type PostTemplate = 'hook' | 'question' | 'stat' | 'quote' | 'announcement' | 'meme' | 'general'

/**
 * Raid package types
 */
export type RaidType = 'product' | 'partnership' | 'milestone' | 'event' | 'general'

/**
 * Thread generation request parameters
 */
export interface GenerateThreadParams {
  userId: string
  message: string
  characterId: 'boo'
  topic: string
  template: ThreadTemplate
  tweetCount?: number
}

/**
 * Thread generation API response
 */
export interface GenerateThreadResponse {
  success: boolean
  message: string
  metadata?: {
    type: 'thread'
    template: ThreadTemplate
    topic: string
    tweets: string[]
    threadStats: {
      tweetCount: number
      avgCharsPerTweet: number
      hashtags: string[]
    }
  }
}

/**
 * Post generation request parameters
 */
export interface GeneratePostParams {
  userId: string
  message: string
  characterId: 'boo'
  topic: string
  template: PostTemplate
}

/**
 * Post generation API response
 */
export interface GeneratePostResponse {
  success: boolean
  message: string
  metadata?: {
    type: 'post'
    template: PostTemplate
    topic: string
    posts: string[]
    postStats: {
      variationCount: number
      avgCharsPerPost: number
      shortest: number
      longest: number
    }
  }
}

/**
 * Raid content generation request parameters
 */
export interface GenerateRaidParams {
  userId: string
  message: string
  characterId: 'boo'
  topic: string
  raidType: RaidType
}

/**
 * Raid package structure
 */
export interface RaidPackage {
  mainThread: string[]
  quoteTweets: string[]
  standalonePosts: string[]
  callToAction: string
  hashtags: string[]
  timing: string
  strategy: string
}

/**
 * Raid content generation API response
 */
export interface GenerateRaidResponse {
  success: boolean
  message: string
  metadata?: {
    type: 'raid_package'
    raidType: RaidType
    topic: string
    package: RaidPackage
  }
}

// ============================================================================
// Message Quota Types
// ============================================================================

/**
 * User message quota information
 */
export interface UserQuota {
  canSend: boolean
  remaining: number
  tier: 'free' | 'holder' | 'whale' | 'allowlist'
  limit: number
  currentCount: number
  reason?: string
}

/**
 * Quota API response
 */
export interface QuotaResponse {
  limit: number
  used: number
  remaining: number
  resetAt: string
  tier: 'free' | 'holder' | 'whale' | 'allowlist'
  quota?: UserQuota
}

/**
 * Quota exceeded error response (HTTP 429)
 */
export interface QuotaExceededResponse {
  error: string
  limitReached: boolean
  message: string
  quota: {
    tier: string
    limit: number
    used: number
    remaining: number
  }
  upgrade?: {
    holder: { threshold: string; limit: number }
    whale: { threshold: string; limit: string }
    tokenMint: string
    buyLink: string
  }
}

// ============================================================================
// Chat Types
// ============================================================================

/**
 * Chat message request body
 */
export interface ChatMessageRequest {
  message: string
  walletAddress: string
  sessionToken?: string
  source?: 'web' | 'telegram'
}

/**
 * Chat message response
 */
export interface ChatMessageResponse {
  success: boolean
  response: string
  actionTriggered?: string
  metadata?: {
    imageUrl?: string
    prompt?: string
    templateId?: string
    generationTime?: number
  }
  messages?: Array<{
    id: string
    role: 'assistant' | 'user'
    content: string
    metadata?: unknown
  }>
}

// ============================================================================
// Health Check Types
// ============================================================================

/**
 * Health check API response
 */
export interface HealthCheckResponse {
  status: string
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Generic API error response structure
 */
export interface ApiErrorResponse {
  error: string
  message?: string
  details?: unknown
  code?: string
}

/**
 * API error class for HTTP error responses
 *
 * Thrown when the API returns a non-2xx status code.
 *
 * @example
 * ```typescript
 * try {
 *   await apiClient.getAgent('invalid-address')
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.error(`API error ${error.status}: ${error.message}`)
 *     console.error('Error code:', error.code)
 *     console.error('Details:', error.details)
 *   }
 * }
 * ```
 */
export class ApiError extends Error {
  /**
   * Create a new API error
   * @param message - Human-readable error message
   * @param status - HTTP status code (e.g., 400, 404, 500)
   * @param code - Machine-readable error code (e.g., 'AGENT_NOT_FOUND')
   * @param details - Additional error details
   */
  constructor(
    message: string,
    public status: number,
    public code: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'

    // Maintains proper stack trace for where our error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError)
    }
  }
}

/**
 * Network error class for connection failures
 *
 * Thrown when the network request itself fails (timeout, DNS, connection refused, etc.)
 *
 * @example
 * ```typescript
 * try {
 *   await apiClient.getAgent('some-address')
 * } catch (error) {
 *   if (error instanceof NetworkError) {
 *     console.error('Network request failed:', error.message)
 *     console.error('Original error:', error.cause)
 *   }
 * }
 * ```
 */
export class NetworkError extends Error {
  /**
   * Create a new network error
   * @param message - Human-readable error message
   * @param cause - Original error that caused the network failure
   */
  constructor(message: string, public cause?: Error) {
    super(message)
    this.name = 'NetworkError'

    // Maintains proper stack trace for where our error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError)
    }
  }
}

/**
 * Timeout error class for request timeouts
 *
 * Thrown when a request exceeds the configured timeout duration.
 *
 * @example
 * ```typescript
 * try {
 *   await apiClient.getAgent('some-address')
 * } catch (error) {
 *   if (error instanceof TimeoutError) {
 *     console.error('Request timed out after', error.timeout, 'ms')
 *   }
 * }
 * ```
 */
export class TimeoutError extends Error {
  /**
   * Create a new timeout error
   * @param message - Human-readable error message
   * @param timeout - Timeout duration in milliseconds
   */
  constructor(message: string, public timeout: number) {
    super(message)
    this.name = 'TimeoutError'

    // Maintains proper stack trace for where our error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TimeoutError)
    }
  }
}
