/**
 * Query X402 Agent Action
 *
 * Action to query x402 agent endpoints and return structured responses
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

export const queryX402AgentAction: Action = {
  name: 'QUERY_X402_AGENT',
  description:
    'Query an x402 agent endpoint to get structured data responses. Supports all query types including GET and POST requests.',

  // Validate: trigger on queries about x402 agents, querying endpoints, etc.
  validate: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {
    const text = (message.content.text || '').toLowerCase()

    // Match x402 query triggers
    const queryTriggers = [
      'query x402',
      'query agent',
      'call agent',
      'test agent',
      'agent endpoint',
      'x402 endpoint',
      'agent api',
      'query endpoint',
      'test endpoint',
      'call endpoint',
    ]

    // Also match if user mentions a specific agent address or endpoint
    const hasAgentAddress = /[A-HJ-NP-Za-km-z1-9]{32,44}/.test(text)
    const hasEndpoint =
      text.includes('http') ||
      text.includes('api.') ||
      text.includes('.fun') ||
      text.includes('.dev')

    return (
      queryTriggers.some((trigger) => text.includes(trigger)) ||
      (hasAgentAddress &&
        (text.includes('query') || text.includes('call') || text.includes('test'))) ||
      (hasEndpoint && (text.includes('query') || text.includes('call') || text.includes('test')))
    )
  },

  // Handler: query x402 agent endpoint and return structured response
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: unknown,
    callback?: HandlerCallback
  ) => {
    try {
      const text = (message.content.text || '').toLowerCase()

      // Get Convex client
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

      // Try to extract agent address from message
      const agentAddressMatch = text.match(/([A-HJ-NP-Za-km-z1-9]{32,44})/)
      const agentAddress = agentAddressMatch ? agentAddressMatch[1] : null

      // Try to extract endpoint URL from message
      const endpointMatch = text.match(/(https?:\/\/[^\s]+)/i)
      const endpointUrl = endpointMatch ? endpointMatch[1] : null

      let agentData = null
      let endpointToQuery = null
      let queryMethod = 'GET'
      let queryBody = null

      // If we have an agent address, fetch agent data from Convex
      if (agentAddress) {
        try {
          agentData = await convex.query(api.ghostDiscovery.getDiscoveredAgent, {
            ghostAddress: agentAddress,
          })

          if (agentData && agentData.x402ServiceEndpoint) {
            endpointToQuery = agentData.x402ServiceEndpoint
          }
        } catch (error) {
          console.error('Error fetching agent data:', error)
        }
      }

      // If we have an explicit endpoint URL, use it
      if (endpointUrl) {
        endpointToQuery = endpointUrl
      }

      // If no endpoint found, try to get from validated agents data
      if (!endpointToQuery) {
        // Query discovered agents with x402 endpoints
        const agents = await convex.query(api.ghostDiscovery.listDiscoveredAgents, {
          limit: 10,
        })

        // Find first agent with x402 endpoint
        for (const agent of agents) {
          if (agent.x402ServiceEndpoint) {
            endpointToQuery = agent.x402ServiceEndpoint
            agentData = agent
            break
          }
        }
      }

      if (!endpointToQuery) {
        const response = {
          text: "I couldn't find an x402 agent endpoint to query. Please provide:\n- An agent address with an x402 endpoint\n- A direct endpoint URL\n- Or ask me to query a discovered agent",
        }

        if (callback) {
          await callback(response)
        }

        return { success: false, error: 'No endpoint found' }
      }

      // Determine method and body from message
      if (text.includes('post') || text.includes('send') || text.includes('submit')) {
        queryMethod = 'POST'
        // Try to extract JSON body if present
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            queryBody = JSON.parse(jsonMatch[0])
          } catch {
            // If not valid JSON, create a simple query object
            queryBody = { query: text }
          }
        } else {
          queryBody = { query: text }
        }
      }

      // Make the query request
      console.log(`Querying x402 endpoint: ${endpointToQuery} (${queryMethod})`)

      const fetchOptions: RequestInit = {
        method: queryMethod,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        redirect: 'manual' as RequestRedirect, // Don't follow redirects, we want to see 402
      }

      if (queryMethod === 'POST' && queryBody) {
        fetchOptions.body = JSON.stringify(queryBody)
      }

      const startTime = Date.now()
      let responseStatus = 0
      let responseData: any = null
      let responseError = null
      let isStructured = false

      try {
        const response = await fetch(endpointToQuery, fetchOptions)
        responseStatus = response.status

        // Handle 402 Payment Required (expected for x402 endpoints)
        if (responseStatus === 402) {
          const paymentInfo = await response.json().catch(() => ({}))

          responseData = {
            status: 402,
            message: 'Payment Required (x402)',
            payment: paymentInfo,
            endpoint: endpointToQuery,
            method: queryMethod,
          }
          isStructured = true
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
              status: responseStatus,
              content: text,
              contentType,
              endpoint: endpointToQuery,
              method: queryMethod,
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
              content: text.substring(0, 500),
              endpoint: endpointToQuery,
              method: queryMethod,
            }
            isStructured = true
          }
        }
      } catch (fetchError: unknown) {
        responseError = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'
        responseData = {
          error: responseError,
          endpoint: endpointToQuery,
          method: queryMethod,
        }
      }

      const responseTimeMs = Date.now() - startTime

      // Format response text
      let responseText = `🔍 **X402 Agent Query Result**\n\n`
      responseText += `**Endpoint:** \`${endpointToQuery}\`\n`
      responseText += `**Method:** ${queryMethod}\n`
      responseText += `**Status:** ${responseStatus || 'Error'}\n`
      responseText += `**Response Time:** ${responseTimeMs}ms\n\n`

      if (responseStatus === 402) {
        responseText += `✅ **Endpoint is working!** This endpoint requires x402 payment.\n\n`
        if (responseData.payment) {
          responseText += `**Payment Info:**\n`
          if (responseData.payment.address) {
            responseText += `- Address: \`${responseData.payment.address}\`\n`
          }
          if (responseData.payment.amount) {
            responseText += `- Amount: ${responseData.payment.amount}\n`
          }
          if (responseData.payment.token) {
            responseText += `- Token: \`${responseData.payment.token}\`\n`
          }
        }
      } else if (responseStatus >= 200 && responseStatus < 300) {
        responseText += `✅ **Query Successful!**\n\n`
        responseText += `**Response Data:**\n\`\`\`json\n${JSON.stringify(responseData, null, 2).substring(0, 1000)}\n\`\`\`\n`
      } else if (responseError) {
        responseText += `❌ **Query Failed:** ${responseError}\n`
      } else {
        responseText += `⚠️ **Unexpected Status:** ${responseStatus}\n\n`
        responseText += `**Response:**\n\`\`\`json\n${JSON.stringify(responseData, null, 2).substring(0, 500)}\n\`\`\`\n`
      }

      if (agentData) {
        responseText += `\n**Agent Info:**\n`
        responseText += `- Address: \`${agentData.ghostAddress}\`\n`
        if (agentData.name) {
          responseText += `- Name: ${agentData.name}\n`
        }
      }

      const response = {
        text: responseText,
        // Metadata for UI rendering
        ui: {
          type: 'x402-query-result',
          endpoint: endpointToQuery,
          method: queryMethod,
          status: responseStatus,
          responseTime: responseTimeMs,
          data: responseData,
          isStructured,
          agent: agentData
            ? {
                address: agentData.ghostAddress,
                name: agentData.name,
              }
            : null,
        },
      }

      if (callback) {
        await callback(response)
      }

      return {
        success: true,
        data: {
          endpoint: endpointToQuery,
          method: queryMethod,
          status: responseStatus,
          responseTime: responseTimeMs,
          data: responseData,
          isStructured,
        },
      }
    } catch (error) {
      console.error('Error querying x402 agent:', error)

      const errorResponse = {
        text: `❌ **Error querying x402 agent:**\n\n${error instanceof Error ? error.message : String(error)}\n\nPlease check:\n- The endpoint URL is correct\n- The agent has an x402 service endpoint configured\n- Network connectivity is available`,
      }

      if (callback) {
        await callback(errorResponse)
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },

  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Query the x402 agent endpoint for agent SAT8g2xU7AFy7eUmNJ9SNrM6yYo7LDCi13GXJ8Ez9kC',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '🔍 **X402 Agent Query Result**\n\n**Endpoint:** `https://wurkapi.fun/solana/xraid/small`\n**Status:** 402 Payment Required\n✅ Endpoint is working!',
          action: 'QUERY_X402_AGENT',
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'Test the x402 endpoint at https://api.syraa.fun/x-search' },
      },
      {
        name: '{{agent}}',
        content: {
          text: '🔍 **X402 Agent Query Result**\n\n**Endpoint:** `https://api.syraa.fun/x-search`\n**Status:** 402 Payment Required\n✅ Endpoint is working!',
          action: 'QUERY_X402_AGENT',
        },
      },
    ],
  ],
}
