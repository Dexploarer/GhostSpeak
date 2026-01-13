/**
 * Endpoint Discovery Actions
 *
 * Discovers and registers x402 endpoints for agents
 */

'use node'

import { action } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import { discoverAgentEndpoints, validateEndpoint } from './lib/endpointDiscovery'

/**
 * Discover and register endpoints for an agent
 * Can be called manually or automatically after agent discovery
 */
export const discoverAndRegisterEndpoints = action({
  args: {
    agentAddress: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      console.log(`[Endpoint Discovery] Discovering endpoints for ${args.agentAddress}...`)

      // Discover endpoints using various methods
      const discovered = await discoverAgentEndpoints(args.agentAddress)

      if (discovered.length === 0) {
        console.log(`[Endpoint Discovery] No endpoints found for ${args.agentAddress}`)
        return {
          success: true,
          discovered: 0,
          registered: 0,
          message: 'No endpoints discovered',
        }
      }

      console.log(`[Endpoint Discovery] Found ${discovered.length} potential endpoints`)

      // Validate and register endpoints
      const validEndpoints = discovered.filter(validateEndpoint)

      if (validEndpoints.length === 0) {
        return {
          success: false,
          error: 'No valid endpoints found after validation',
          discovered: discovered.length,
          registered: 0,
        }
      }

      // Register endpoints via upsertObservedEndpointInternal (internal mutation)
      let imported = 0
      let skipped = 0

      for (const ep of validEndpoints) {
        // Normalize method and category to match schema types
        const method: 'GET' | 'POST' = ep.method.toUpperCase() === 'POST' ? 'POST' : 'GET'
        const category: 'research' | 'market_data' | 'social' | 'utility' | 'other' = [
          'research',
          'market_data',
          'social',
          'utility',
        ].includes(ep.category.toLowerCase())
          ? (ep.category.toLowerCase() as 'research' | 'market_data' | 'social' | 'utility')
          : 'other'

        const result = await ctx.runMutation(internal.observation.upsertObservedEndpointInternal, {
          agentAddress: ep.agentAddress,
          baseUrl: ep.baseUrl,
          endpoint: ep.endpoint,
          method,
          priceUsdc: ep.priceUsdc,
          description: ep.description,
          category,
        })

        if (result.created) {
          imported++
        } else {
          skipped++
        }
      }

      console.log(
        `[Endpoint Discovery] Registered ${imported} endpoints (${skipped} duplicates skipped)`
      )

      return {
        success: true,
        discovered: discovered.length,
        registered: imported,
        skipped,
        endpoints: validEndpoints.map((e: any) => ({
          url: e.endpoint,
          method: e.method,
          price: e.priceUsdc,
        })),
      }
    } catch (error) {
      console.error(`[Endpoint Discovery] Error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        discovered: 0,
        registered: 0,
      }
    }
  },
})
