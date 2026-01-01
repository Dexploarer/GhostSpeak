/**
 * elizaOS x402 Resource Fetching
 *
 * Fetches live x402 agents from elizaOS gateway
 * to aggregate in the GhostSpeak marketplace
 *
 * VERIFIED: 2025-12-31
 * - API endpoint: https://x402.elizaos.ai/agents (NOT /api/agents)
 * - Response structure verified from GitHub repo
 * - No pricing/network/category data available from API
 */

import type { ExternalResource } from './fetchExternalResources'

// =====================================================
// TYPES (Based on actual elizaOS API)
// =====================================================

/**
 * Agent response from GET /agents
 * (Simplified - groups/endpoints not included)
 */
interface ElizaOSAgentSummary {
  id: string
  name: string
  description: string
  icon: string
  endpointCount: number
}

/**
 * Response from GET /agents
 */
interface ElizaOSAgentsResponse {
  agents: ElizaOSAgentSummary[]
}

/**
 * Full agent details from GET /agents/:agentId
 * (Includes nested groups and endpoints)
 */
interface ElizaOSAgentFull {
  id: string
  name: string
  description: string
  icon: string
  groups: ElizaOSGroup[]
}

/**
 * Group structure (internal to elizaOS)
 */
interface ElizaOSGroup {
  id: string
  name: string
  baseUrl: string
  endpoints: ElizaOSEndpoint[]
}

/**
 * Endpoint structure
 */
interface ElizaOSEndpoint {
  id: string
  name: string
  description: string
  path: string // Public API path like "/api/users"
  upstreamUrl: string // Where it proxies to
  method: string[] // ["GET", "POST", etc.]
  parameters?: string
  exampleResponse?: unknown
}

// =====================================================
// CONFIGURATION
// =====================================================

const ELIZAOS_BASE_URL = 'https://x402.elizaos.ai'
const ELIZAOS_AGENTS_URL = `${ELIZAOS_BASE_URL}/agents`
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// In-memory cache
let cachedElizaOSResources: ExternalResource[] | null = null
let cacheTimestamp = 0

// Track API availability
let lastApiCheckTimestamp = 0
let isApiAvailable = false

// =====================================================
// ELIZAOS RESOURCE FETCHER
// =====================================================

/**
 * Fetch agents from elizaOS x402 gateway
 *
 * NOTE: elizaOS does not provide pricing, network, or category information
 * in their API. We default to 'varies' for pricing and 'other' for category.
 *
 * To avoid N+1 queries, we only fetch the agent list (not individual agent details).
 * This gives us agent names and descriptions, which is enough for discovery.
 *
 * COMING SOON MODE: If the API is unavailable (site down), we return placeholder
 * resources marked as 'coming_soon' so users know the integration exists and
 * will be available when the elizaOS site recovers.
 */
export async function fetchElizaOSResources(): Promise<ExternalResource[]> {
  // Return cached if fresh (and update status based on API availability)
  if (cachedElizaOSResources && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    // Update status of cached resources based on current API availability
    const resourcesWithStatus = cachedElizaOSResources.map((r) => ({
      ...r,
      availabilityStatus: isApiAvailable ? ('available' as const) : ('coming_soon' as const),
      statusMessage: isApiAvailable
        ? undefined
        : 'elizaOS x402 gateway is currently under maintenance. Integration will be available when the service recovers.',
    }))

    console.log('[elizaOS] Returning cached resources:', {
      count: resourcesWithStatus.length,
      status: isApiAvailable ? 'available' : 'coming_soon',
      age: Math.round((Date.now() - cacheTimestamp) / 1000) + 's',
    })
    return resourcesWithStatus
  }

  try {
    console.log('[elizaOS] Fetching agents from:', ELIZAOS_AGENTS_URL)
    lastApiCheckTimestamp = Date.now()

    const response = await fetch(ELIZAOS_AGENTS_URL, {
      next: { revalidate: 300 }, // Next.js cache for 5 min
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      isApiAvailable = false

      console.warn('[elizaOS] API unavailable:', {
        status: response.status,
        statusText: response.statusText,
        url: ELIZAOS_AGENTS_URL,
        message: response.status === 502 ? 'Site under maintenance' : 'API error',
      })

      // Return placeholder "coming soon" resources
      return getElizaOSPlaceholderResources()
    }

    const data = (await response.json()) as ElizaOSAgentsResponse

    if (!data.agents || !Array.isArray(data.agents)) {
      console.error('[elizaOS] Invalid response format:', data)
      isApiAvailable = false
      return getElizaOSPlaceholderResources()
    }

    // API is available! Mark status as available
    isApiAvailable = true

    // Map each agent to an ExternalResource
    // Since we don't have endpoint details without fetching each agent individually,
    // we create a single resource per agent pointing to their detail page
    const resources: ExternalResource[] = data.agents.map((agent) => ({
      id: `elizaos_${agent.id}`,
      url: `${ELIZAOS_BASE_URL}/agents/${agent.id}`, // Link to agent detail page
      name: agent.name,
      description: agent.description || `elizaOS ${agent.name} agent`,
      category: 'other', // elizaOS doesn't provide category information
      tags: ['elizaos', 'x402'],
      network: 'unknown', // elizaOS doesn't specify network in API
      priceUsd: 'varies', // elizaOS doesn't provide pricing in API
      facilitator: 'elizaos',
      isActive: true, // Assume active if listed
      isExternal: true as const,
      availabilityStatus: 'available' as const,
    }))

    // Update cache
    cachedElizaOSResources = resources
    cacheTimestamp = Date.now()

    console.log('[elizaOS] ✅ Successfully fetched and cached agents:', {
      count: resources.length,
      agents: resources.map((r) => r.name),
      status: 'available',
      ttl: CACHE_TTL_MS / 1000 + 's',
    })

    return resources
  } catch (error) {
    isApiAvailable = false

    console.error('[elizaOS] Error fetching agents:', {
      error: error instanceof Error ? error.message : String(error),
      url: ELIZAOS_AGENTS_URL,
      returning: 'placeholder resources',
    })

    // Return placeholder "coming soon" resources
    return getElizaOSPlaceholderResources()
  }
}

/**
 * Get placeholder resources for when elizaOS API is unavailable
 *
 * Returns a "coming soon" resource to indicate the integration exists
 * and will be available when the elizaOS site recovers.
 */
function getElizaOSPlaceholderResources(): ExternalResource[] {
  const placeholders: ExternalResource[] = [
    {
      id: 'elizaos_placeholder',
      url: ELIZAOS_BASE_URL,
      name: 'elizaOS x402 Agents',
      description:
        'Access to elizaOS x402 gateway agents. Integration is ready and will be available when the elizaOS service is online.',
      category: 'other',
      tags: ['elizaos', 'x402', 'coming-soon'],
      network: 'unknown',
      priceUsd: 'varies',
      facilitator: 'elizaos',
      isActive: false, // Not active yet
      isExternal: true as const,
      availabilityStatus: 'coming_soon' as const,
      statusMessage:
        'elizaOS x402 gateway is currently under maintenance. Integration will be available when the service recovers.',
    },
  ]

  // Cache placeholders
  if (!cachedElizaOSResources) {
    cachedElizaOSResources = placeholders
    cacheTimestamp = Date.now()
  }

  console.log('[elizaOS] 🔜 Returning placeholder resources (coming soon)')

  return placeholders
}

/**
 * Fetch detailed information for a specific elizaOS agent
 *
 * This makes an additional API call to GET /agents/:agentId
 * to retrieve the full agent configuration including groups and endpoints.
 *
 * @param agentId - The elizaOS agent ID
 * @returns Full agent details with endpoints, or null if not found
 */
export async function fetchElizaOSAgentDetails(
  agentId: string
): Promise<ElizaOSAgentFull | null> {
  try {
    const url = `${ELIZAOS_AGENTS_URL}/${agentId}`
    console.log('[elizaOS] Fetching agent details:', url)

    const response = await fetch(url, {
      next: { revalidate: 300 },
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('[elizaOS] Failed to fetch agent details:', {
        agentId,
        status: response.status,
        url,
      })
      return null
    }

    const agent = (await response.json()) as ElizaOSAgentFull

    console.log('[elizaOS] Fetched agent details:', {
      agentId: agent.id,
      name: agent.name,
      groupCount: agent.groups?.length ?? 0,
      endpointCount: agent.groups?.reduce((sum, g) => sum + (g.endpoints?.length ?? 0), 0) ?? 0,
    })

    return agent
  } catch (error) {
    console.error('[elizaOS] Error fetching agent details:', {
      agentId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Expand an elizaOS agent into individual endpoint resources
 *
 * Fetches the full agent details and creates an ExternalResource for each endpoint.
 * Useful for displaying all available endpoints in the marketplace.
 *
 * @param agentId - The elizaOS agent ID
 * @returns Array of ExternalResource objects, one per endpoint
 */
export async function expandElizaOSAgentEndpoints(
  agentId: string
): Promise<ExternalResource[]> {
  const agent = await fetchElizaOSAgentDetails(agentId)

  if (!agent || !agent.groups) {
    return []
  }

  const resources: ExternalResource[] = []

  for (const group of agent.groups) {
    for (const endpoint of group.endpoints || []) {
      resources.push({
        id: `elizaos_${agent.id}_${endpoint.id}`,
        url: `${ELIZAOS_BASE_URL}${endpoint.path}`,
        name: `${agent.name} - ${endpoint.name}`,
        description: endpoint.description || agent.description,
        category: 'other', // Could try to infer from endpoint name/description
        tags: ['elizaos', 'x402', agent.id, ...endpoint.method.map((m) => m.toLowerCase())],
        network: 'unknown',
        priceUsd: 'varies',
        facilitator: 'elizaos',
        isActive: true,
        isExternal: true as const,
      })
    }
  }

  return resources
}

/**
 * Get elizaOS resource by ID
 */
export async function getElizaOSResourceById(id: string): Promise<ExternalResource | null> {
  const resources = await fetchElizaOSResources()
  return resources.find((r) => r.id === id) || null
}

/**
 * Search elizaOS resources by query
 */
export async function searchElizaOSResources(query: string): Promise<ExternalResource[]> {
  const resources = await fetchElizaOSResources()
  const lowerQuery = query.toLowerCase()

  return resources.filter(
    (r) =>
      r.name.toLowerCase().includes(lowerQuery) ||
      r.description?.toLowerCase().includes(lowerQuery) ||
      r.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  )
}

/**
 * Get elizaOS resources by category
 *
 * NOTE: Since elizaOS doesn't provide category information,
 * all resources will have category='other'
 */
export async function getElizaOSResourcesByCategory(
  category: string
): Promise<ExternalResource[]> {
  const resources = await fetchElizaOSResources()
  return resources.filter((r) => r.category === category)
}

/**
 * Clear elizaOS cache (useful for development/testing)
 */
export function clearElizaOSCache(): void {
  cachedElizaOSResources = null
  cacheTimestamp = 0
  console.log('[elizaOS] Cache cleared')
}

/**
 * Check if elizaOS API is currently available
 *
 * @returns Status information about the elizaOS gateway
 */
export function getElizaOSStatus(): {
  isAvailable: boolean
  lastCheck: number
  timeSinceCheck: number
  message: string
} {
  const timeSinceCheck = Date.now() - lastApiCheckTimestamp

  return {
    isAvailable: isApiAvailable,
    lastCheck: lastApiCheckTimestamp,
    timeSinceCheck,
    message: isApiAvailable
      ? 'elizaOS x402 gateway is online and operational'
      : lastApiCheckTimestamp === 0
        ? 'elizaOS x402 gateway has not been checked yet'
        : 'elizaOS x402 gateway is currently unavailable (site under maintenance)',
  }
}
