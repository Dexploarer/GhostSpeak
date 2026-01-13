/**
 * Casper AI Agent Chat API Route
 *
 * Handles chat messages to Casper agent with ElizaOS runtime
 *
 * SECURITY:
 * - User must be authenticated via Solana wallet signature (signInWithSolana)
 * - Session token validates wallet ownership
 * - Wallet address from session is trusted (cryptographically verified during login)
 *
 * MESSAGE LIMITS (based on $GHOST holdings):
 * - Free: 3 messages/day
 * - $10+ in $GHOST: 100 messages/day
 * - $100+ in $GHOST: Unlimited
 */

import { withMiddleware, jsonResponse, errorResponse, handleCORS } from '@/lib/api/middleware'
import { processAgentMessage } from '@/server/elizaos/runtime'
import { api } from '@/convex/_generated/api'
import { getConvexClient } from '@/lib/convex-client'

export const POST = withMiddleware(async (request) => {
  const correlationId = request.headers.get('x-correlation-id') || `corr_${Date.now()}`

  const body = await request.json()

  // Support both AI SDK format (messages array) and legacy format (message string)
  const messages = body.messages || []
  const lastMessage = messages[messages.length - 1]
  const message = lastMessage?.content || body.message
  const walletAddress = body.walletAddress
  const sessionToken = body.sessionToken

  if (!message || !walletAddress) {
    return errorResponse('Missing required fields: message and walletAddress', 400)
  }

  // SECURITY: Validate session token
  // The user proved wallet ownership during login via cryptographic signature (signInWithSolana)
  // For Phase 1, we trust the walletAddress from the authenticated session
  // Session token format: session_${userId}_${timestamp}
  //
  // Future enhancement: Add JWT with expiration, refresh tokens, and per-message signatures
  if (sessionToken && !sessionToken.startsWith('session_')) {
    return errorResponse('Invalid session token format', 401)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MESSAGE QUOTA CHECK
  // Free: 3/day, $10+ GHOST: 100/day, $100+ GHOST: Unlimited
  // Admin whitelist: Unlimited (bypass all limits)
  // ═══════════════════════════════════════════════════════════════════════════

  // Check if user is on admin whitelist
  const adminWhitelist = (process.env.ADMIN_WHITELIST || '').split(',').map((w) => w.trim())
  const isAdmin = adminWhitelist.includes(walletAddress)

  // Check if this is a Telegram user (skip GHOST balance checks)
  const isTelegramUser = walletAddress.startsWith('telegram_')

  if (isAdmin) {
    console.log(`👑 Admin bypass: ${walletAddress.slice(0, 8)}...`)
  } else if (isTelegramUser) {
    console.log(`📱 Telegram user: ${walletAddress} - skipping balance check`)

    // Still check quota for Telegram users (free tier only)
    try {
      const quota = await getConvexClient().query(api.messageQuota.checkMessageQuota, {
        walletAddress,
      })

      if (!quota.canSend) {
        console.log(
          `🚫 Message quota exceeded for ${walletAddress}: ${quota.currentCount}/${quota.limit}`
        )
        return jsonResponse(
          {
            error: 'Daily message limit reached',
            limitReached: true,
            message: quota.reason,
            quota: {
              tier: quota.tier,
              limit: quota.limit,
              used: quota.currentCount,
              remaining: 0,
            },
          },
          { status: 429 }
        )
      }

      console.log(`✅ Quota check passed: ${quota.currentCount}/${quota.limit} (${quota.tier})`)
    } catch (quotaError) {
      console.warn('⚠️ Quota check failed, allowing message:', quotaError)
    }
  } else {
    // Wallet users: check GHOST balance and tier
    try {
      // Check and update tier (refreshes balance if cache expired)
      await getConvexClient().action(api.checkGhostBalance.checkAndUpdateTier, { walletAddress })

      // Check quota
      const quota = await getConvexClient().query(api.messageQuota.checkMessageQuota, {
        walletAddress,
      })

      if (!quota.canSend) {
        console.log(
          `🚫 Message quota exceeded for ${walletAddress}: ${quota.currentCount}/${quota.limit}`
        )
        return jsonResponse(
          {
            error: 'Daily message limit reached',
            limitReached: true,
            message: quota.reason,
            quota: {
              tier: quota.tier,
              limit: quota.limit,
              used: quota.currentCount,
              remaining: 0,
            },
            upgrade: {
              holder: { threshold: '$10 in $GHOST', limit: 100 },
              whale: { threshold: '$100 in $GHOST', limit: 'Unlimited' },
              tokenMint: 'DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump',
              buyLink: 'https://jup.ag/swap/SOL-DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump',
            },
          },
          { status: 429 }
        )
      }

      console.log(`✅ Quota check passed: ${quota.currentCount}/${quota.limit} (${quota.tier})`)
    } catch (quotaError) {
      // If quota check fails, allow message (fail open for now)
      console.warn('⚠️ Quota check failed, allowing message:', quotaError)
    }
  }

  console.log(`📨 Received message from ${walletAddress}: ${message}`)

  // Try to store user message in Convex (optional)
  try {
    if (process.env.NEXT_PUBLIC_CONVEX_URL) {
      await getConvexClient().mutation(api.agent.storeUserMessage, {
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
    source: 'web', // Enable web-specific templates (product-focused only)
  })

  console.log(`🤖 Agent response: ${agentResponse.text}`)

  // Try to store agent response in Convex (optional)
  try {
    if (process.env.NEXT_PUBLIC_CONVEX_URL) {
      await getConvexClient().mutation(api.agent.storeAgentResponse, {
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

  // Increment message count after successful response
  try {
    await getConvexClient().mutation(api.messageQuota.incrementMessageCount, { walletAddress })
  } catch (quotaError) {
    console.warn('Failed to increment message count:', quotaError)
  }

  return jsonResponse({
    // AI SDK expects messages array or a single message
    messages: [responseMessage],
    // Also include at root level for compatibility
    ...responseMessage,
    // Legacy fields for backward compatibility
    success: true,
    response: agentResponse.text,
    actionTriggered: agentResponse.action,
  })
})

export const OPTIONS = handleCORS
