/**
 * API Client for GhostSpeak Mini App
 *
 * This client calls the existing apps/web API endpoints
 * All business logic lives in apps/web, Mini App is just a UI
 */

import { config } from './config'

const API_BASE = config.webAppUrl

interface ApiError {
  error: string
  message?: string
  details?: unknown
}

class GhostSpeakApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'GhostSpeakApiError'
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: 'Unknown error',
      }))
      throw new GhostSpeakApiError(
        error.message || error.error,
        response.status,
        error.details
      )
    }

    return response.json()
  } catch (error) {
    if (error instanceof GhostSpeakApiError) {
      throw error
    }
    throw new GhostSpeakApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    )
  }
}

// ========================================
// Agent Discovery
// ========================================

export interface AgentDiscoveryParams {
  address?: string
  verified?: boolean
  limit?: number
}

export interface AgentInfo {
  address: string
  name: string
  verified: boolean
  ghostScore: number
  credentials: number
  endpoint?: string
}

export async function discoverAgents(params: AgentDiscoveryParams = {}) {
  const queryParams = new URLSearchParams()
  if (params.address) queryParams.set('address', params.address)
  if (params.verified !== undefined) queryParams.set('verified', String(params.verified))
  if (params.limit) queryParams.set('limit', String(params.limit))

  return fetchApi<{ agents: AgentInfo[] }>(
    `/api/v1/discovery?${queryParams.toString()}`
  )
}

// ========================================
// Image Generation (Boo)
// ========================================

export interface GenerateImageParams {
  userId: string
  prompt: string
  template?: string
  characterId?: 'boo' | 'caisper'
}

export interface GenerateImageResponse {
  success: boolean
  imageUrl?: string
  message: string
}

export async function generateImage(params: GenerateImageParams) {
  return fetchApi<GenerateImageResponse>('/api/agent/chat', {
    method: 'POST',
    body: JSON.stringify({
      userId: `telegram_${params.userId}`,
      message: params.template
        ? `/media ${params.prompt}`
        : params.prompt,
      characterId: params.characterId || 'boo',
      source: 'telegram',
    }),
  })
}

// ========================================
// Ghost Score (Reputation)
// ========================================

export interface GhostScoreData {
  score: number
  factors: {
    transactionVolume: number
    successRate: number
    averageResponseTime: number
    uptime: number
  }
  history: {
    date: string
    score: number
  }[]
}

export async function getGhostScore(address: string) {
  return fetchApi<GhostScoreData>(`/api/v1/agent/${address}`)
}

// ========================================
// User Quota
// ========================================

export interface QuotaInfo {
  limit: number
  used: number
  remaining: number
  resetAt: string
  tier: 'free' | 'holder' | 'whale' | 'allowlist'
}

export async function getUserQuota(telegramUserId: number) {
  return fetchApi<QuotaInfo>(`/api/v1/quota?userId=telegram_${telegramUserId}`)
}

// ========================================
// Health Check
// ========================================

export async function healthCheck() {
  return fetchApi<{ status: string }>('/api/v1/health')
}
