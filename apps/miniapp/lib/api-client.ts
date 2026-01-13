/**
 * Production-grade type-safe API client for GhostSpeak Mini App
 *
 * This client provides:
 * - Exponential backoff retry logic (3 attempts)
 * - 30-second timeout for all requests
 * - Request/response logging (dev only)
 * - Type-safe methods for all endpoints
 * - Proper error handling with custom error classes
 *
 * All API calls target the main web app (apps/web).
 * Business logic lives in the web app; miniapp is a lightweight UI.
 *
 * @module lib/api-client
 */

import { endpoints } from './config'
import { isDevelopment } from './env'
import type {
  AgentDiscoveryParams,
  AgentDiscoveryResponse,
  AgentDetailsResponse,
  GhostScoreData,
  GenerateImageParams,
  GenerateImageResponse,
  GenerateThreadParams,
  GenerateThreadResponse,
  GeneratePostParams,
  GeneratePostResponse,
  GenerateRaidParams,
  GenerateRaidResponse,
  QuotaResponse,
  ChatMessageRequest,
  ChatMessageResponse,
  HealthCheckResponse,
  ApiErrorResponse,
  UserQuota,
} from './types'
import { ApiError, NetworkError, TimeoutError } from './types'

// Re-export error classes for convenience
export { ApiError, NetworkError, TimeoutError }

// ============================================================================
// Configuration
// ============================================================================

/**
 * Request timeout in milliseconds (30 seconds)
 */
const REQUEST_TIMEOUT_MS = 30_000

/**
 * Maximum number of retry attempts
 */
const MAX_RETRIES = 3

/**
 * Initial retry delay in milliseconds (doubles with each retry)
 */
const INITIAL_RETRY_DELAY_MS = 1000

/**
 * HTTP status codes that should trigger a retry
 */
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504]

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sleep for a specified duration
 * @param ms - Duration in milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay
 * @param attempt - Current attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number): number {
  return INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)
}

/**
 * Log request details (development only)
 */
function logRequest(method: string, url: string, body?: unknown): void {
  if (!isDevelopment) return

  console.log(`[API] ${method} ${url}`)
  if (body && method !== 'GET') {
    console.log('[API] Request body:', body)
  }
}

/**
 * Log response details (development only)
 */
function logResponse(url: string, status: number, data?: unknown): void {
  if (!isDevelopment) return

  console.log(`[API] Response from ${url}: ${status}`)
  if (data) {
    console.log('[API] Response data:', data)
  }
}

/**
 * Log error details (development only)
 */
function logError(url: string, error: unknown): void {
  if (!isDevelopment) return

  console.error(`[API] Error from ${url}:`, error)
}

// ============================================================================
// Core Fetch Function with Retry Logic
// ============================================================================

/**
 * Fetch with timeout wrapper
 * @param url - Request URL
 * @param options - Fetch options
 * @param timeout - Timeout in milliseconds
 * @returns Fetch response
 * @throws {TimeoutError} If request exceeds timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(`Request timed out after ${timeout}ms`, timeout)
    }
    throw error
  }
}

/**
 * Core fetch function with retry logic and error handling
 *
 * @param url - Full URL to fetch
 * @param options - Fetch options
 * @param attempt - Current attempt number (0-indexed, used internally)
 * @returns Parsed JSON response
 * @throws {ApiError} If API returns error response
 * @throws {NetworkError} If network request fails
 * @throws {TimeoutError} If request exceeds timeout
 */
async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  attempt = 0
): Promise<T> {
  const method = options.method || 'GET'

  try {
    // Log request (dev only)
    logRequest(method, url, options.body)

    // Fetch with timeout
    const response = await fetchWithTimeout(url, options, REQUEST_TIMEOUT_MS)

    // Log response (dev only)
    logResponse(url, response.status)

    // Handle non-OK responses
    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json().catch(() => ({
        error: 'Unknown error',
        message: `HTTP ${response.status}`,
      }))

      // Retry on retryable status codes
      if (
        RETRYABLE_STATUS_CODES.includes(response.status) &&
        attempt < MAX_RETRIES - 1
      ) {
        const delay = calculateBackoffDelay(attempt)
        if (isDevelopment) {
          console.log(
            `[API] Retrying after ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`
          )
        }
        await sleep(delay)
        return fetchWithRetry<T>(url, options, attempt + 1)
      }

      // Throw API error
      throw new ApiError(
        errorData.message || errorData.error || `HTTP ${response.status}`,
        response.status,
        errorData.code || 'API_ERROR',
        errorData.details
      )
    }

    // Parse and return JSON response
    const data = await response.json()
    logResponse(url, response.status, data)
    return data
  } catch (error) {
    logError(url, error)

    // Re-throw known error types
    if (
      error instanceof ApiError ||
      error instanceof TimeoutError ||
      error instanceof NetworkError
    ) {
      throw error
    }

    // Retry on network errors
    if (attempt < MAX_RETRIES - 1) {
      const delay = calculateBackoffDelay(attempt)
      if (isDevelopment) {
        console.log(
          `[API] Retrying after ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`
        )
      }
      await sleep(delay)
      return fetchWithRetry<T>(url, options, attempt + 1)
    }

    // Throw network error
    throw new NetworkError(
      error instanceof Error ? error.message : 'Network request failed',
      error instanceof Error ? error : undefined
    )
  }
}

/**
 * Convenience wrapper for GET requests
 */
async function get<T>(url: string, headers?: HeadersInit): Promise<T> {
  return fetchWithRetry<T>(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

/**
 * Convenience wrapper for POST requests
 */
async function post<T>(
  url: string,
  body?: unknown,
  headers?: HeadersInit
): Promise<T> {
  return fetchWithRetry<T>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ============================================================================
// Agent Discovery
// ============================================================================

/**
 * Discover agents on the GhostSpeak network
 *
 * @param params - Query parameters (address, verified, limit)
 * @returns List of discovered agents
 * @throws {ApiError} If API returns error
 * @throws {NetworkError} If network fails
 * @throws {TimeoutError} If request times out
 *
 * @example
 * ```typescript
 * // Find all verified agents
 * const { agents } = await apiClient.discoverAgents({ verified: true, limit: 10 })
 *
 * // Find specific agent by address
 * const { agents } = await apiClient.discoverAgents({ address: '4wHjA2a5Y...' })
 * ```
 */
export async function discoverAgents(
  params: AgentDiscoveryParams = {}
): Promise<AgentDiscoveryResponse> {
  const queryParams = new URLSearchParams()
  if (params.address) queryParams.set('address', params.address)
  if (params.verified !== undefined) queryParams.set('verified', String(params.verified))
  if (params.limit) queryParams.set('limit', String(params.limit))

  const url = `${endpoints.discoverAgents()}?${queryParams.toString()}`
  return get<AgentDiscoveryResponse>(url)
}

/**
 * Get detailed information about a specific agent
 *
 * @param address - Agent's Solana address (32-44 chars, base58)
 * @returns Agent details including discovery info, ownership, metadata
 * @throws {ApiError} If agent not found or API error (404, 400, etc.)
 * @throws {NetworkError} If network fails
 * @throws {TimeoutError} If request times out
 *
 * @example
 * ```typescript
 * const { agent } = await apiClient.getAgent('4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB')
 * console.log('Agent status:', agent.status)
 * console.log('Claimed by:', agent.ownership.claimedBy)
 * ```
 */
export async function getAgent(address: string): Promise<AgentDetailsResponse> {
  const url = endpoints.getAgent(address)
  return get<AgentDetailsResponse>(url)
}

// ============================================================================
// Ghost Score (Reputation)
// ============================================================================

/**
 * Get Ghost Score and reputation data for an agent
 *
 * @param address - Agent's Solana address
 * @returns Ghost Score data including factors and history
 * @throws {ApiError} If agent not found or API error
 * @throws {NetworkError} If network fails
 * @throws {TimeoutError} If request times out
 *
 * @example
 * ```typescript
 * const scoreData = await apiClient.getGhostScore('4wHjA2a5Y...')
 * console.log('Score:', scoreData.score)
 * console.log('Success rate:', scoreData.factors.successRate)
 * ```
 */
export async function getGhostScore(address: string): Promise<GhostScoreData> {
  const url = endpoints.getAgent(address)
  return get<GhostScoreData>(url)
}

// ============================================================================
// Image Generation (Boo)
// ============================================================================

/**
 * Generate AI image via Boo agent
 *
 * @param params - Generation parameters (userId, message, characterId)
 * @returns Generation response with image URL and metadata
 * @throws {ApiError} If quota exceeded (429) or generation fails
 * @throws {NetworkError} If network fails
 * @throws {TimeoutError} If request times out
 *
 * @example
 * ```typescript
 * const result = await apiClient.generateImage({
 *   userId: '123456',
 *   message: 'cute ghost with sunglasses',
 *   characterId: 'boo',
 * })
 *
 * if (result.success && result.metadata?.imageUrl) {
 *   console.log('Image URL:', result.metadata.imageUrl)
 * }
 * ```
 */
export async function generateImage(
  params: GenerateImageParams
): Promise<GenerateImageResponse> {
  const url = endpoints.agentChat()

  const body: any = {
    message: params.message,
    walletAddress: `telegram_${params.userId}`,
    sessionToken: `session_${params.userId}_miniapp`,
    source: 'telegram',
    characterId: params.characterId || 'boo', // Pass character ID to API
  }

  return post<GenerateImageResponse>(url, body)
}

/**
 * Generate X/Twitter thread via Boo agent
 *
 * @param params - Thread generation parameters (userId, topic, template)
 * @returns Thread generation response with tweets and metadata
 * @throws {ApiError} If quota exceeded (429) or generation fails
 * @throws {NetworkError} If network fails
 * @throws {TimeoutError} If request times out
 *
 * @example
 * ```typescript
 * const result = await apiClient.generateThread({
 *   userId: '123456',
 *   message: 'generate raid thread about Ghost Score',
 *   characterId: 'boo',
 *   topic: 'Ghost Score',
 *   template: 'raid',
 * })
 *
 * if (result.success && result.metadata?.tweets) {
 *   console.log('Generated', result.metadata.tweets.length, 'tweets')
 * }
 * ```
 */
export async function generateThread(
  params: GenerateThreadParams
): Promise<GenerateThreadResponse> {
  const url = endpoints.agentChat()

  const body: any = {
    message: params.message,
    walletAddress: `telegram_${params.userId}`,
    sessionToken: `session_${params.userId}_miniapp`,
    source: 'telegram',
    characterId: params.characterId || 'boo', // Pass character ID to API
  }

  return post<GenerateThreadResponse>(url, body)
}

/**
 * Generate standalone X/Twitter post via Boo agent
 *
 * @param params - Post generation parameters (userId, topic, template)
 * @returns Post generation response with post variations and metadata
 * @throws {ApiError} If quota exceeded (429) or generation fails
 * @throws {NetworkError} If network fails
 * @throws {TimeoutError} If request times out
 *
 * @example
 * ```typescript
 * const result = await apiClient.generatePost({
 *   userId: '123456',
 *   message: 'generate hook post about GhostSpeak',
 *   characterId: 'boo',
 *   topic: 'GhostSpeak',
 *   template: 'hook',
 * })
 *
 * if (result.success && result.metadata?.posts) {
 *   console.log('Generated', result.metadata.posts.length, 'post variations')
 * }
 * ```
 */
export async function generatePost(
  params: GeneratePostParams
): Promise<GeneratePostResponse> {
  const url = endpoints.agentChat()

  const body: any = {
    message: params.message,
    walletAddress: `telegram_${params.userId}`,
    sessionToken: `session_${params.userId}_miniapp`,
    source: 'telegram',
    characterId: params.characterId || 'boo', // Pass character ID to API
  }

  return post<GeneratePostResponse>(url, body)
}

/**
 * Generate complete raid package via Boo agent
 *
 * @param params - Raid generation parameters (userId, topic, raidType)
 * @returns Raid package with main thread, quote tweets, standalone posts, and strategy
 * @throws {ApiError} If quota exceeded (429) or generation fails
 * @throws {NetworkError} If network fails
 * @throws {TimeoutError} If request times out
 *
 * @example
 * ```typescript
 * const result = await apiClient.generateRaidContent({
 *   userId: '123456',
 *   message: 'generate raid content for Ghost Score launch',
 *   characterId: 'boo',
 *   topic: 'Ghost Score Launch',
 *   raidType: 'product',
 * })
 *
 * if (result.success && result.metadata?.package) {
 *   console.log('Main thread:', result.metadata.package.mainThread.length, 'tweets')
 *   console.log('Quote tweets:', result.metadata.package.quoteTweets.length)
 *   console.log('CTA:', result.metadata.package.callToAction)
 * }
 * ```
 */
export async function generateRaidContent(
  params: GenerateRaidParams
): Promise<GenerateRaidResponse> {
  const url = endpoints.agentChat()

  const body: any = {
    message: params.message,
    walletAddress: `telegram_${params.userId}`,
    sessionToken: `session_${params.userId}_miniapp`,
    source: 'telegram',
    characterId: params.characterId || 'boo', // Pass character ID to API
  }

  return post<GenerateRaidResponse>(url, body)
}

// ============================================================================
// User Quota
// ============================================================================

/**
 * Get user's daily message/image generation quota
 *
 * @param userId - User identifier (telegram_userId or wallet address)
 * @returns Quota information (tier, limit, used, remaining)
 * @throws {ApiError} If API error
 * @throws {NetworkError} If network fails
 * @throws {TimeoutError} If request times out
 *
 * @example
 * ```typescript
 * const quota = await apiClient.getUserQuota('telegram_123456')
 * console.log(`${quota.remaining}/${quota.limit} messages remaining (${quota.tier} tier)`)
 * ```
 */
export async function getUserQuota(userId: string): Promise<QuotaResponse> {
  const url = endpoints.getUserQuota(userId)
  return get<QuotaResponse>(url)
}

// ============================================================================
// Chat
// ============================================================================

/**
 * Send a chat message to Caisper AI agent
 *
 * @param request - Chat message request
 * @returns Agent response with text and optional metadata
 * @throws {ApiError} If quota exceeded (429) or API error
 * @throws {NetworkError} If network fails
 * @throws {TimeoutError} If request times out
 *
 * @example
 * ```typescript
 * const response = await apiClient.sendChatMessage({
 *   message: 'Tell me about GhostSpeak',
 *   walletAddress: 'telegram_123456',
 *   sessionToken: 'session_123456_miniapp',
 * })
 *
 * console.log('Agent:', response.response)
 * ```
 */
export async function sendChatMessage(
  request: ChatMessageRequest
): Promise<ChatMessageResponse> {
  const url = endpoints.agentChat()
  return post<ChatMessageResponse>(url, request)
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check API health status
 *
 * @returns Health status response
 * @throws {ApiError} If API is down
 * @throws {NetworkError} If network fails
 * @throws {TimeoutError} If request times out
 *
 * @example
 * ```typescript
 * const health = await apiClient.healthCheck()
 * console.log('API status:', health.status)
 * ```
 */
export async function healthCheck(): Promise<HealthCheckResponse> {
  const url = endpoints.healthCheck()
  return get<HealthCheckResponse>(url)
}

// ============================================================================
// Default Export (convenient for imports)
// ============================================================================

// ============================================================================
// User Images
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
 * Get user's generated images
 *
 * @param userId - User identifier (telegram_userId)
 * @returns List of user's images
 * @throws {ApiError} If API error
 * @throws {NetworkError} If network fails
 * @throws {TimeoutError} If request times out
 *
 * @example
 * ```typescript
 * const images = await apiClient.getUserImages('telegram_123456')
 * console.log(`User has ${images.length} images`)
 * ```
 */
export async function getUserImages(userId: string): Promise<UserImage[]> {
  const url = endpoints.getUserImages(userId)
  const response = await get<{ images: UserImage[] }>(url)
  return response.images || []
}

/**
 * Get agent score (alias for getGhostScore for backward compatibility)
 */
export const getAgentScore = getGhostScore

// ============================================================================
// Default Export (convenient for imports)
// ============================================================================

/**
 * API client instance with all methods
 *
 * @example
 * ```typescript
 * import { apiClient } from '@/lib/api-client'
 *
 * // Use any method
 * const { agents } = await apiClient.discoverAgents()
 * const quota = await apiClient.getUserQuota('telegram_123456')
 * ```
 */
export const apiClient = {
  discoverAgents,
  getAgent,
  getGhostScore,
  getAgentScore,
  generateImage,
  generateThread,
  generatePost,
  generateRaidContent,
  getUserQuota,
  getUserImages,
  sendChatMessage,
  healthCheck,
}
