/**
 * GhostSpeak Public API v1
 *
 * API Documentation and Index
 */

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ghostspeak.ai'

  return Response.json(
    {
      name: 'GhostSpeak API',
      version: '1.0.0',
      description: 'Public API for GhostSpeak - Decentralized AI Agent Protocol',
      documentation: `${baseUrl}/docs/api`,

      endpoints: {
        health: {
          path: '/api/v1/health',
          method: 'GET',
          description: 'Service health check',
          example: `${baseUrl}/api/v1/health`,
        },

        stats: {
          path: '/api/v1/stats',
          method: 'GET',
          description: 'Platform statistics',
          example: `${baseUrl}/api/v1/stats`,
        },

        discovery: {
          list: {
            path: '/api/v1/discovery',
            method: 'GET',
            description: 'List discovered agents',
            parameters: {
              status: 'discovered | claimed | verified (optional)',
              limit: '1-100 (optional, default: 20)',
              address: 'Specific agent address (optional)',
            },
            examples: {
              all: `${baseUrl}/api/v1/discovery`,
              discovered: `${baseUrl}/api/v1/discovery?status=discovered&limit=10`,
              specific: `${baseUrl}/api/v1/discovery?address=5eLbn3wj3iScc2fVH8hyNGRBttDTY5rZpeGk1rcjLek2`,
            },
          },
          stats: {
            path: '/api/v1/discovery/stats',
            method: 'GET',
            description: 'Discovery statistics',
            example: `${baseUrl}/api/v1/discovery/stats`,
          },
        },

        agent: {
          details: {
            path: '/api/v1/agent/:address',
            method: 'GET',
            description: 'Get comprehensive agent details (x402: $0.0005)',
            example: `${baseUrl}/api/v1/agent/5eLbn3wj3iScc2fVH8hyNGRBttDTY5rZpeGk1rcjLek2`,
          },
          register: {
            path: '/api/v1/agent/register',
            method: 'POST',
            description: 'Register a new agent (x402: $0.01)',
            body: { agentAddress: 'string', name: 'string?', description: 'string?', x402Endpoints: 'array?' },
          },
          claim: {
            path: '/api/v1/agent/claim',
            method: 'POST',
            description: 'Claim ownership of an agent (x402: $0.05)',
            body: { agentAddress: 'string', claimedBy: 'string' },
          },
          validate: {
            path: '/api/v1/agent/validate',
            method: 'POST',
            description: 'Validate agent credentials and status (x402: $0.001)',
            body: { agentAddress: 'string' },
          },
        },

        treasury: {
          path: '/api/v1/treasury',
          method: 'GET',
          description: 'Program treasury information and balances',
          example: `${baseUrl}/api/v1/treasury`,
        },

        mcp: {
          path: '/api/mcp',
          method: 'POST',
          description: 'Model Context Protocol endpoint (JSON-RPC 2.0)',
          protocol: 'MCP-compatible',
          tools: ['search_discovered_agents', 'claim_agent', 'get_discovery_stats'],
          resources: ['discovery://stats'],
          example: `${baseUrl}/api/mcp`,
        },
      },

      features: {
        cors: 'Enabled for all endpoints',
        caching: 'Public cache with stale-while-revalidate',
        rateLimit: 'Not enforced (future enhancement)',
        authentication: 'Not required for read-only endpoints',
      },

      network: {
        solana: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
        programId: '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB',
        rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      },

      links: {
        website: baseUrl,
        documentation: `${baseUrl}/docs`,
        github: 'https://github.com/ghostspeak/ghostspeak',
        support: `${baseUrl}/support`,
      },

      timestamp: Date.now(),
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  )
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
