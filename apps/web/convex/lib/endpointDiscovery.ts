/**
 * Endpoint Discovery for x402 Agents
 *
 * Discovers available x402 endpoints for agents using standard discovery protocols
 */

'use node'

export interface DiscoveredEndpoint {
  agentAddress: string
  baseUrl: string
  endpoint: string
  method: string
  priceUsdc: number
  description: string
  category: string
}

/**
 * Discover endpoints for an agent via x402 protocol
 *
 * Attempts multiple discovery methods:
 * 1. .well-known/x402.json (standard discovery endpoint)
 * 2. Root endpoint with 402 response parsing
 * 3. Common x402 patterns
 */
export async function discoverAgentEndpoints(
  agentAddress: string
): Promise<DiscoveredEndpoint[]> {
  const endpoints: DiscoveredEndpoint[] = []

  // Try standard discovery methods
  const discoveryUrls = [
    `https://${agentAddress}/.well-known/x402.json`,
    `https://${agentAddress}/x402.json`,
    `https://${agentAddress}/endpoints.json`,
    `https://${agentAddress}/api/x402`,
  ]

  for (const url of discoveryUrls) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()

        // Parse discovery format
        if (data.endpoints && Array.isArray(data.endpoints)) {
          for (const ep of data.endpoints) {
            endpoints.push({
              agentAddress,
              baseUrl: ep.baseUrl || new URL(url).origin,
              endpoint: ep.url || ep.endpoint,
              method: ep.method || 'GET',
              priceUsdc: parsePrice(ep.price || ep.priceUsdc || ep.amount),
              description: ep.description || ep.name || 'No description provided',
              category: ep.category || ep.type || 'other',
            })
          }

          console.log(`[Discovery] Found ${endpoints.length} endpoints via ${url}`)
          break // Success, stop trying other URLs
        }
      }
    } catch (error) {
      // Continue to next discovery method
      continue
    }
  }

  // If no endpoints found via discovery, try 402 probing
  if (endpoints.length === 0) {
    console.log(`[Discovery] Standard discovery failed, trying 402 probing for ${agentAddress}`)

    const probeUrls = [`https://${agentAddress}/`, `https://${agentAddress}/api`]

    for (const url of probeUrls) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.status === 402) {
          const data = await response.json()

          if (data.accepts && Array.isArray(data.accepts)) {
            // Found x402 endpoint
            const accept = data.accepts[0]
            const priceUsdc = parsePrice(accept?.maxAmountRequired)

            endpoints.push({
              agentAddress,
              baseUrl: new URL(url).origin,
              endpoint: url,
              method: 'GET',
              priceUsdc,
              description: data.message || 'x402 payment required',
              category: 'other',
            })

            console.log(`[Discovery] Found x402 endpoint via 402 probing: ${url}`)
          }
        }
      } catch (error) {
        continue
      }
    }
  }

  return endpoints
}

/**
 * Parse price from various formats to USDC decimal
 */
function parsePrice(price: any): number {
  if (typeof price === 'number') {
    // Already in USDC
    return price
  }

  if (typeof price === 'string') {
    // Could be micro-USDC (integer string) or decimal USDC
    const num = parseFloat(price)
    if (num > 1000) {
      // Likely micro-USDC (6 decimals)
      return num / 1e6
    }
    return num
  }

  // Default to $0.01 if unknown
  return 0.01
}

/**
 * Validate discovered endpoint
 */
export function validateEndpoint(endpoint: DiscoveredEndpoint): boolean {
  return (
    !!endpoint.agentAddress &&
    !!endpoint.endpoint &&
    !!endpoint.method &&
    endpoint.priceUsdc >= 0 &&
    endpoint.priceUsdc <= 100 // Max $100 per endpoint
  )
}
