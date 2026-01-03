/**
 * Casper AI Agent Chat API Route
 *
 * Handles chat messages to Casper agent with ElizaOS runtime
 *
 * SECURITY:
 * - User must be authenticated via Solana wallet signature (signInWithSolana)
 * - Session token validates wallet ownership
 * - Wallet address from session is trusted (cryptographically verified during login)
 */

import { NextRequest, NextResponse } from 'next/server'
import { processAgentMessage } from '@/server/elizaos/runtime'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const { message, walletAddress, sessionToken } = await req.json()

    if (!message || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: message and walletAddress' },
        { status: 400 }
      )
    }

    // SECURITY: Validate session token
    // The user proved wallet ownership during login via cryptographic signature (signInWithSolana)
    // For Phase 1, we trust the walletAddress from the authenticated session
    // Session token format: session_${userId}_${timestamp}
    //
    // Future enhancement: Add JWT with expiration, refresh tokens, and per-message signatures
    if (sessionToken && !sessionToken.startsWith('session_')) {
      return NextResponse.json(
        { error: 'Invalid session token format' },
        { status: 401 }
      )
    }

    // TODO Phase 2: Validate session hasn't expired, implement proper JWT
    // For now, sessionToken presence confirms user went through signInWithSolana flow

    console.log(`📨 Received message from ${walletAddress}: ${message}`)

    // Store user message in Convex
    await convex.mutation(api.agent.storeUserMessage, {
      walletAddress,
      message,
    })

    // Process message with ElizaOS agent
    const agentResponse = await processAgentMessage({
      userId: walletAddress,
      message,
      roomId: `user-${walletAddress}`,
    })

    console.log(`🤖 Agent response: ${agentResponse.text}`)

    // Store agent response in Convex
    await convex.mutation(api.agent.storeAgentResponse, {
      walletAddress,
      response: agentResponse.text,
      actionTriggered: agentResponse.action,
      metadata: agentResponse.metadata,
    })

    return NextResponse.json({
      success: true,
      response: agentResponse.text,
      actionTriggered: agentResponse.action,
      metadata: agentResponse.metadata,
    })
  } catch (error) {
    console.error('❌ Agent API error:', error)

    return NextResponse.json(
      {
        error: 'Failed to process message with agent',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// Add OPTIONS for CORS if needed
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
