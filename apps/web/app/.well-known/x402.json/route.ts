/**
 * x402 Discovery Endpoint
 *
 * Exposes Caisper/GhostSpeak's x402-enabled services for automatic discovery.
 *
 * This endpoint follows the x402 v2 discovery specification and allows
 * facilitators, clients, and other agents to discover available services,
 * pricing, and payment requirements.
 *
 * Spec: https://www.x402.org/writing/x402-v2-launch
 */

import { NextResponse } from 'next/server'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ghostspeak.io'
const CAISPER_ADDRESS =
  process.env.CAISPER_WALLET_ADDRESS || 'CjNXSBUPTM3aAuqLB2KWBN66VTmnh5o1sYeQW8YaQimc'
const FACILITATOR_ADDRESS =
  process.env.PAYAI_FACILITATOR_ADDRESS || '2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4'

export async function GET() {
  const discovery = {
    // Provider metadata
    provider: {
      name: 'GhostSpeak',
      description: 'On-chain reputation and trust verification for AI agents on Solana',
      agentAddress: CAISPER_ADDRESS,
      website: BASE_URL,
      contact: 'https://twitter.com/ghostspeak_io',
    },

    // x402-enabled endpoints
    endpoints: [
      {
        // Agent verification service
        name: 'Agent Verification',
        description:
          "Verify an AI agent's on-chain credentials, reputation score, and transaction history",
        url: `${BASE_URL}/api/x402/verify`,
        endpoint: '/api/x402/verify',
        baseUrl: BASE_URL,
        method: 'POST',
        category: 'verification',

        // Pricing (x402 v2 format)
        price: 0.01, // USDC
        priceUsdc: 0.01,
        amount: '10000', // micro-USDC (6 decimals)

        // Payment configuration
        accepts: [
          {
            scheme: 'exact',
            network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', // Solana mainnet (CAIP-2)
            asset: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501', // USDC on Solana
            payTo: CAISPER_ADDRESS,
            maxAmountRequired: '10000', // 0.01 USDC in micro-USDC
            extra: {
              feePayer: FACILITATOR_ADDRESS,
            },
          },
          {
            scheme: 'exact',
            network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1', // Solana devnet (CAIP-2)
            asset: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1/slip44:501',
            payTo: CAISPER_ADDRESS,
            maxAmountRequired: '10000',
            extra: {
              feePayer: FACILITATOR_ADDRESS,
            },
          },
        ],

        // Request/response format
        requestFormat: {
          type: 'application/json',
          schema: {
            agentAddress: 'string (required) - Solana wallet address of the agent to verify',
            includeCredentials: 'boolean (optional) - Include issued credentials in response',
            includeHistory: 'boolean (optional) - Include transaction history',
          },
        },
        responseFormat: {
          type: 'application/json',
          schema: {
            verified: 'boolean - Whether agent is verified',
            ghostScore: "number - Agent's reputation score (0-100)",
            credentials: 'array - Issued credentials (if requested)',
            timestamp: 'number - Verification timestamp',
          },
        },
      },

      {
        // Ghost Score lookup service
        name: 'Ghost Score Lookup',
        description:
          "Get an agent's real-time reputation score based on on-chain activity, credentials, and Observatory testing",
        url: `${BASE_URL}/api/x402/score`,
        endpoint: '/api/x402/score',
        baseUrl: BASE_URL,
        method: 'GET',
        category: 'analytics',

        price: 0.005,
        priceUsdc: 0.005,
        amount: '5000', // 0.005 USDC in micro-USDC

        accepts: [
          {
            scheme: 'exact',
            network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            asset: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
            payTo: CAISPER_ADDRESS,
            maxAmountRequired: '5000',
            extra: {
              feePayer: FACILITATOR_ADDRESS,
            },
          },
          {
            scheme: 'exact',
            network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
            asset: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1/slip44:501',
            payTo: CAISPER_ADDRESS,
            maxAmountRequired: '5000',
            extra: {
              feePayer: FACILITATOR_ADDRESS,
            },
          },
        ],

        requestFormat: {
          type: 'application/json',
          queryParams: {
            agent: 'string (required) - Solana wallet address',
          },
        },
        responseFormat: {
          type: 'application/json',
          schema: {
            agentAddress: 'string - Agent wallet address',
            score: 'object - Detailed Ghost Score breakdown',
          },
        },
      },

      {
        // Capability verification service
        name: 'Capability Verification',
        description:
          'Verify that an agent possesses claimed capabilities through live testing and credential validation',
        url: `${BASE_URL}/api/x402/capabilities`,
        endpoint: '/api/x402/capabilities',
        baseUrl: BASE_URL,
        method: 'POST',
        category: 'verification',

        price: 0.01,
        priceUsdc: 0.01,
        amount: '10000',

        accepts: [
          {
            scheme: 'exact',
            network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            asset: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
            payTo: CAISPER_ADDRESS,
            maxAmountRequired: '10000',
            extra: {
              feePayer: FACILITATOR_ADDRESS,
            },
          },
          {
            scheme: 'exact',
            network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
            asset: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1/slip44:501',
            payTo: CAISPER_ADDRESS,
            maxAmountRequired: '10000',
            extra: {
              feePayer: FACILITATOR_ADDRESS,
            },
          },
        ],

        requestFormat: {
          type: 'application/json',
          schema: {
            agentAddress: 'string (required) - Agent to verify',
            capabilities: 'array (required) - List of capabilities to verify',
            testMode: 'string (optional) - "live" or "credentials-only"',
          },
        },
        responseFormat: {
          type: 'application/json',
          schema: {
            verified: 'boolean - Overall verification result',
            capabilities: 'array - Per-capability verification results',
            timestamp: 'number - Verification timestamp',
          },
        },
      },
    ],

    // x402 v2 metadata
    version: '2.0',
    updatedAt: new Date().toISOString(),
  }

  return NextResponse.json(discovery, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*', // Allow cross-origin discovery
    },
  })
}
