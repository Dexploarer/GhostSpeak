/**
 * Treasury API - Public Endpoints
 *
 * GET /api/v1/treasury - Get program treasury information and balances
 */

import { createServerSolanaClient } from '@/lib/solana/client'
import { NextRequest } from 'next/server'

// Program Treasury Wallet (from protocol_config)
// This should be fetched from on-chain config in production
const PROGRAM_ID = '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB'

export async function GET(request: NextRequest) {
  try {
    // Create Solana client using Gill (cleaner API)
    const client = createServerSolanaClient()

    // For now, return treasury stats from Convex
    // In production, this should query the actual on-chain treasury account
    // Example future usage:
    // const balance = await client.getBalance(PROGRAM_ID)
    // const account = await client.getAccount(treasuryPDA)
    return Response.json(
      {
        treasury: {
          programId: PROGRAM_ID,
          network: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',

          // These would come from on-chain queries in production
          balances: {
            sol: 0, // Query from on-chain
            fees_collected: 0, // From transaction history
          },

          stats: {
            total_transactions: 0, // From indexer
            total_fees_collected: 0, // From indexer
            total_staking_rewards_distributed: 0, // From indexer
          },

          info: {
            message: 'Treasury data will be populated from on-chain queries',
            note: 'Connect to indexer for historical fee collection data',
          },
        },
        timestamp: Date.now(),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    console.error('Treasury API error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
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
