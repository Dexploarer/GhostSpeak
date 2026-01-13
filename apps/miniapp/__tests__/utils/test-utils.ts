/**
 * Test utilities for GhostSpeak Miniapp tests
 *
 * Provides mock helpers, test fixtures, and utility functions for testing.
 *
 * @module __tests__/utils/test-utils
 */

import type {
  AgentDiscoveryResponse,
  AgentDetailsResponse,
  GhostScoreData,
  QuotaResponse,
  GenerateImageResponse,
  ChatMessageResponse,
  HealthCheckResponse,
  UserImage,
} from '../../lib/types'

// ============================================================================
// Environment Variable Mocking
// ============================================================================

/**
 * Valid test environment variables
 */
export const validTestEnv = {
  NEXT_PUBLIC_APP_URL: 'http://localhost:3334',
  NEXT_PUBLIC_WEB_APP_URL: 'http://localhost:3333',
  NEXT_PUBLIC_CONVEX_URL: 'https://lovely-cobra-639.convex.cloud',
  NEXT_PUBLIC_SOLANA_RPC_URL: 'https://api.devnet.solana.com',
  NEXT_PUBLIC_SOLANA_NETWORK: 'devnet',
  NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID: '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB',
  NEXT_PUBLIC_GHOST_TOKEN_ADDRESS: 'GHoSTgvU7Uw1hVJWj1V1W1q9F1q1q1q1q1q1q1q1q1q',
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: 'boo_gs_bot',
  NODE_ENV: 'test',
} as const

/**
 * Invalid test environment variables (missing required fields)
 */
export const invalidTestEnv = {
  NEXT_PUBLIC_APP_URL: undefined,
  NEXT_PUBLIC_WEB_APP_URL: 'http://localhost:3333',
  NEXT_PUBLIC_CONVEX_URL: 'invalid-url',
  NEXT_PUBLIC_SOLANA_RPC_URL: 'https://api.devnet.solana.com',
  NEXT_PUBLIC_SOLANA_NETWORK: 'devnet',
  NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID: '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB',
  NEXT_PUBLIC_GHOST_TOKEN_ADDRESS: 'GHoSTgvU7Uw1hVJWj1V1W1q9F1q1q1q1q1q1q1q1q1q',
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: 'boo_gs_bot',
  NODE_ENV: 'test',
} as const

/**
 * Set environment variables for testing
 */
export function setTestEnv(env: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

/**
 * Reset environment variables to original state
 */
export function resetTestEnv(originalEnv: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

// ============================================================================
// Mock Fetch Functions
// ============================================================================

/**
 * Mock fetch response builder
 */
export function mockFetchResponse<T>(
  data: T,
  status = 200,
  statusText = 'OK'
): Response {
  return new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Mock fetch error response
 */
export function mockFetchErrorResponse(
  error: string,
  message: string,
  status = 400,
  code = 'API_ERROR'
): Response {
  return new Response(
    JSON.stringify({ error, message, code }),
    {
      status,
      statusText: 'Error',
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

/**
 * Mock fetch that always succeeds
 */
export function createMockFetchSuccess<T>(data: T, delay = 0): typeof fetch {
  return async () => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
    return mockFetchResponse(data)
  }
}

/**
 * Mock fetch that always fails with API error
 */
export function createMockFetchError(
  status: number,
  error: string,
  message: string,
  delay = 0
): typeof fetch {
  return async () => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
    return mockFetchErrorResponse(error, message, status)
  }
}

/**
 * Mock fetch that times out
 */
export function createMockFetchTimeout(delay = 35000): typeof fetch {
  return async () => {
    await new Promise((resolve) => setTimeout(resolve, delay))
    return mockFetchResponse({ success: true })
  }
}

/**
 * Mock fetch that fails then succeeds (for retry testing)
 */
export function createMockFetchRetry<T>(
  data: T,
  failCount = 2,
  errorStatus = 500
): typeof fetch {
  let attempts = 0
  return async () => {
    attempts++
    if (attempts <= failCount) {
      return mockFetchErrorResponse('Server Error', 'Temporary failure', errorStatus)
    }
    return mockFetchResponse(data)
  }
}

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Mock agent discovery response
 */
export const mockAgentDiscoveryResponse: AgentDiscoveryResponse = {
  agents: [
    {
      address: '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB',
      name: 'Test Agent 1',
      verified: true,
      ghostScore: 850,
      credentials: 5,
      endpoint: 'https://example.com/agent1',
    },
    {
      address: '5xJhA3b6YD5uxAc5OQpxZqjxo6GhzzzvuJVsCH8UoG1qC',
      name: 'Test Agent 2',
      verified: false,
      ghostScore: 650,
      credentials: 2,
    },
  ],
}

/**
 * Mock agent details response
 */
export const mockAgentDetailsResponse: AgentDetailsResponse = {
  agent: {
    address: '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB',
    status: 'active',
    discovery: {
      source: 'onchain',
      firstSeenTimestamp: 1704067200000,
      slot: 123456789,
      blockTime: 1704067200,
      firstTxSignature: '5J7x...',
      facilitatorAddress: '9xJh...',
    },
    ownership: {
      claimedBy: 'owner123',
      claimedAt: 1704067200000,
    },
    metadata: {
      ipfsCid: 'QmTest123',
      ipfsUri: 'ipfs://QmTest123',
      fileId: 'file123',
    },
    externalIds: [
      {
        platform: 'twitter',
        externalId: '@testagent',
        verified: true,
        verifiedAt: 1704067200000,
      },
    ],
  },
  timestamp: Date.now(),
}

/**
 * Mock ghost score data
 */
export const mockGhostScoreData: GhostScoreData = {
  score: 850,
  factors: {
    transactionVolume: 0.9,
    successRate: 0.95,
    averageResponseTime: 0.85,
    uptime: 0.99,
  },
  history: [
    { date: '2024-01-01', score: 800 },
    { date: '2024-01-02', score: 825 },
    { date: '2024-01-03', score: 850 },
  ],
}

/**
 * Mock quota response
 */
export const mockQuotaResponse: QuotaResponse = {
  limit: 20,
  used: 5,
  remaining: 15,
  resetAt: '2024-01-04T00:00:00Z',
  tier: 'free',
}

/**
 * Mock image generation response
 */
export const mockImageGenerationResponse: GenerateImageResponse = {
  success: true,
  message: 'Image generated successfully',
  imageUrl: 'https://example.com/image123.png',
  metadata: {
    imageUrl: 'https://example.com/image123.png',
    prompt: 'cute ghost with sunglasses',
    templateId: 'template-001',
    generationTime: 2500,
    ui: {
      imageUrl: 'https://example.com/image123.png',
    },
  },
}

/**
 * Mock chat response
 */
export const mockChatResponse: ChatMessageResponse = {
  success: true,
  response: 'Hello! How can I help you today?',
  messages: [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Hello! How can I help you today?',
    },
  ],
}

/**
 * Mock health check response
 */
export const mockHealthCheckResponse: HealthCheckResponse = {
  status: 'ok',
}

/**
 * Mock user images
 */
export const mockUserImages: UserImage[] = [
  {
    _id: 'img-1',
    storageUrl: 'https://example.com/image1.png',
    prompt: 'cute ghost',
    templateId: 'template-001',
    createdAt: Date.now() - 86400000,
    upvotes: 10,
    downvotes: 2,
  },
  {
    _id: 'img-2',
    storageUrl: 'https://example.com/image2.png',
    prompt: 'spooky ghost',
    createdAt: Date.now() - 43200000,
    upvotes: 5,
    downvotes: 1,
  },
]

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Wait for a specified duration (for testing timing/delays)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Create a mock AbortController for timeout testing
 */
export function createMockAbortController(): AbortController {
  const controller = new AbortController()
  return controller
}
