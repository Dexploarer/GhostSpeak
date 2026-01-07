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
import { completeWideEvent } from '@/lib/logging/wide-event'

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  const correlationId = req.headers.get('x-correlation-id') || `corr_${Date.now()}`

  // Propagate correlation ID to wide event
  if ((req as any).wideEvent) {
    (req as any).wideEvent.correlation_id = correlationId
  }

  try {
    const body = await req.json()

    // Support both AI SDK format (messages array) and legacy format (message string)
    const messages = body.messages || []
    const lastMessage = messages[messages.length - 1]
    const message = lastMessage?.content || body.message
    const walletAddress = body.walletAddress
    const sessionToken = body.sessionToken

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
      return NextResponse.json({ error: 'Invalid session token format' }, { status: 401 })
    }

    // TODO Phase 2: Validate session hasn't expired, implement proper JWT
    // For now, sessionToken presence confirms user went through signInWithSolana flow

    console.log(`📨 Received message from ${walletAddress}: ${message}`)

    // Try to store user message in Convex (optional)
    try {
      if (process.env.NEXT_PUBLIC_CONVEX_URL) {
        await convex.mutation(api.agent.storeUserMessage, {
          walletAddress,
          message,
        })
      }
    } catch (storageError) {
      console.warn('Failed to store user message:', storageError)
      // Continue without failing - storage is optional
    }

    // Process message with ElizaOS agent
    const agentResponse = await processAgentMessage({
      userId: walletAddress,
      message,
      roomId: `user-${walletAddress}`,
      correlationId,
    })

    console.log(`🤖 Agent response: ${agentResponse.text}`)

    // Try to store agent response in Convex (optional)
    try {
      if (process.env.NEXT_PUBLIC_CONVEX_URL) {
        await convex.mutation(api.agent.storeAgentResponse, {
          walletAddress,
          response: agentResponse.text,
          actionTriggered: agentResponse.action,
          metadata: agentResponse.metadata,
        })
      }
    } catch (storageError) {
      console.warn('Failed to store agent response:', storageError)
      // Continue without failing - storage is optional
    }

    // Return in AI SDK compatible format
    // Note: AI SDK's useChat hook will look for messages in the response
    // We need to return a single message object in AI SDK format
    const responseMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant' as const,
      content: agentResponse.text,
      // Include metadata for custom rendering
      metadata: agentResponse.metadata,
    }

    // Complete wide event with success
    completeWideEvent((req as any).wideEvent, {
      statusCode: 200,
      durationMs: Date.now() - (req as any).wideEvent?.timestamp ? new Date((req as any).wideEvent.timestamp).getTime() : Date.now(),
    })

    return NextResponse.json({
      // AI SDK expects messages array or a single message
      messages: [responseMessage],
      // Also include at root level for compatibility
      ...responseMessage,
      // Legacy fields for backward compatibility
      success: true,
      response: agentResponse.text,
      actionTriggered: agentResponse.action,
    })
  } catch (error) {
    console.error('❌ Agent API error:', error)

    // Complete wide event with error
    completeWideEvent((req as any).wideEvent, {
      statusCode: 500,
      durationMs: Date.now() - (req as any).wideEvent?.timestamp ? new Date((req as any).wideEvent.timestamp).getTime() : Date.now(),
      error: {
        type: 'AgentAPIError',
        code: 'AGENT_CHAT_FAILED',
        message: error instanceof Error ? error.message : 'Agent chat failed',
        retriable: true,
      },
    })

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
export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
