/**
 * X402 Agent Query API - x402 Protected + Rate Limited
 *
 * POST /api/v1/x402/query - Query an x402 agent endpoint
 */

import { api } from '@/convex/_generated/api'
import { requireX402Payment } from '@/lib/x402-middleware'
import { getConvexClient } from '@/lib/convex-client'
import { withMiddleware, jsonResponse, errorResponse, handleCORS } from '@/lib/api/middleware'

export const POST = withMiddleware(async (request) => {
  // Require x402 payment (now async with on-chain verification)
  const paymentRequired = await requireX402Payment(request, { priceUsdc: 0.002 }, getConvexClient())
  if (paymentRequired) return paymentRequired

  const body = await request.json()
  const { endpoint, agentAddress, method = 'GET', body: queryBody } = body

  if (!endpoint && !agentAddress) {
    return errorResponse('Missing required field: endpoint or agentAddress', 400)
  }

  let endpointToQuery = endpoint
  let agentData = null

  // If agent address provided, fetch agent data and endpoint
  if (agentAddress) {
    try {
      agentData = await getConvexClient().query(api.ghostDiscovery.getDiscoveredAgent, {
        ghostAddress: agentAddress,
      })

      // Check for observed endpoints
      const endpoints = await getConvexClient().query(api.observation.listEndpoints, {
        agentAddress: agentAddress,
        activeOnly: true,
        limit: 1,
      })

      if (endpoints && endpoints.length > 0) {
        endpointToQuery = endpoints[0].endpoint
      } else if (!endpointToQuery) {
        return errorResponse('Agent does not have an active x402 service endpoint configured', 404)
      }
    } catch (error) {
      console.error('Error fetching agent data:', error)
      return errorResponse('Failed to fetch agent data', 500)
    }
  }

  if (!endpointToQuery) {
    return errorResponse('No endpoint URL provided', 400)
  }

  // Validate endpoint URL
  try {
    new URL(endpointToQuery)
  } catch {
    return errorResponse('Invalid endpoint URL format', 400)
  }

  // Make the query request
  const fetchOptions: RequestInit = {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    redirect: 'manual' as RequestRedirect,
  }

  if (method.toUpperCase() === 'POST' && queryBody) {
    fetchOptions.body = typeof queryBody === 'string' ? queryBody : JSON.stringify(queryBody)
  }

  const startTime = Date.now()
  let responseStatus = 0
  let responseData: unknown = null
  const responseHeaders: Record<string, string> = {}
  let responseError = null
  let isStructured = false

  try {
    const response = await fetch(endpointToQuery, fetchOptions)
    responseStatus = response.status

    // Capture response headers
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    // Handle 402 Payment Required (expected for x402 endpoints)
    if (responseStatus === 402) {
      try {
        responseData = await response.json()
        isStructured = true
      } catch {
        const text = await response.text()
        responseData = {
          error: 'Payment required',
          message: text,
        }
      }
    }
    // Handle successful responses
    else if (responseStatus >= 200 && responseStatus < 300) {
      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('application/json')) {
        responseData = await response.json()
        isStructured = true
      } else {
        const text = await response.text()
        responseData = {
          content: text,
          contentType,
        }
        isStructured = true
      }
    }
    // Handle other status codes
    else {
      try {
        responseData = await response.json()
        isStructured = true
      } catch {
        const text = await response.text()
        responseData = {
          status: responseStatus,
          content: text.substring(0, 1000),
        }
        isStructured = true
      }
    }
  } catch (fetchError: unknown) {
    const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'
    responseError = errorMessage
    responseData = {
      error: responseError,
    }
  }

  const responseTimeMs = Date.now() - startTime

  // Return structured response
  return jsonResponse({
    success: true,
    endpoint: endpointToQuery,
    method: method.toUpperCase(),
    status: responseStatus,
    responseTime: responseTimeMs,
    headers: responseHeaders,
    data: responseData,
    isStructured,
    agent: agentData
      ? {
          address: agentData.ghostAddress,
          name: agentData.name,
          x402Enabled: agentData.x402Enabled,
          x402PricePerCall: agentData.x402PricePerCall,
          x402AcceptedTokens: agentData.x402AcceptedTokens,
        }
      : null,
    timestamp: new Date().toISOString(),
  })
})

export const OPTIONS = handleCORS
