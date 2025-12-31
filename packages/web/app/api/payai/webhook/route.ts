/**
 * PayAI Webhook API Route
 *
 * Handles incoming webhooks from PayAI for payment events.
 * Records payments to the GhostSpeak reputation system.
 *
 * @route POST /api/payai/webhook
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createPayAIWebhookHandler, type PayAIReputationRecord } from '@ghostspeak/sdk'

// =====================================================
// ENVIRONMENT VALIDATION
// =====================================================

const WEBHOOK_SECRET = process.env.PAYAI_WEBHOOK_SECRET

// =====================================================
// REPUTATION STORAGE (In-Memory Cache for Development)
// In production, replace with Redis/PostgreSQL
// =====================================================

interface ReputationEntry {
  agentAddress: string
  overallScore: number
  totalJobsCompleted: number
  totalJobsFailed: number
  avgResponseTime: number
  paymentHistory: Array<{
    timestamp: number
    paymentId: string
    amount: string
    success: boolean
    responseTimeMs: number
    reputationChange: number
  }>
  lastUpdated: number
}

const reputationCache = new Map<string, ReputationEntry>()

// Default starting score (50%)
const DEFAULT_SCORE = 5000

// =====================================================
// REPUTATION CALCULATION
// =====================================================

/**
 * Calculate reputation change from a payment
 */
function calculateReputationChange(record: PayAIReputationRecord): number {
  // Base score from success/failure
  let baseScore = record.success ? 100 : -200

  // Bonus for fast response
  if (record.responseTimeMs < 500) {
    baseScore += 50
  } else if (record.responseTimeMs < 2000) {
    baseScore += 25
  } else if (record.responseTimeMs > 10000) {
    baseScore -= 25
  }

  // Scale by payment amount (larger payments = more weight)
  const amountUSDC = Number(record.amount) / 1_000_000
  const multiplier = Math.min(2, 1 + amountUSDC * 0.1)

  return Math.round(baseScore * multiplier)
}

/**
 * Update agent reputation from payment
 */
function updateReputation(record: PayAIReputationRecord): ReputationEntry {
  const agentKey = record.agentAddress.toString()

  // Get or create reputation entry
  let entry = reputationCache.get(agentKey)
  if (!entry) {
    entry = {
      agentAddress: agentKey,
      overallScore: DEFAULT_SCORE,
      totalJobsCompleted: 0,
      totalJobsFailed: 0,
      avgResponseTime: 0,
      paymentHistory: [],
      lastUpdated: Date.now(),
    }
  }

  // Calculate reputation change
  const change = calculateReputationChange(record)

  // Update score (capped 0-10000)
  const newScore = Math.max(0, Math.min(10000, entry.overallScore + change))

  // Update running average response time
  const totalJobs = entry.totalJobsCompleted + entry.totalJobsFailed + 1
  entry.avgResponseTime = Math.round(
    (entry.avgResponseTime * (totalJobs - 1) + record.responseTimeMs) / totalJobs
  )

  // Update counters
  if (record.success) {
    entry.totalJobsCompleted++
  } else {
    entry.totalJobsFailed++
  }

  // Add to payment history (keep last 100)
  entry.paymentHistory.unshift({
    timestamp: record.timestamp.getTime(),
    paymentId: record.paymentSignature,
    amount: record.amount.toString(),
    success: record.success,
    responseTimeMs: record.responseTimeMs,
    reputationChange: change,
  })
  if (entry.paymentHistory.length > 100) {
    entry.paymentHistory = entry.paymentHistory.slice(0, 100)
  }

  // Update entry
  entry.overallScore = newScore
  entry.lastUpdated = Date.now()
  reputationCache.set(agentKey, entry)

  return entry
}

// =====================================================
// REPUTATION RECORDING
// =====================================================

/**
 * Record a PayAI payment to the reputation system
 */
async function recordToReputation(record: PayAIReputationRecord): Promise<void> {
  const entry = updateReputation(record)
  const change = calculateReputationChange(record)

  console.log('[PayAI Webhook] Reputation updated:', {
    agent: record.agentAddress.toString(),
    success: record.success,
    responseTimeMs: record.responseTimeMs,
    amount: record.amount.toString(),
    change,
    newScore: entry.overallScore,
    tier: getReputationTier(entry.overallScore),
    totalJobs: entry.totalJobsCompleted + entry.totalJobsFailed,
  })

  // ===== AGENT AUTHORIZATION (ERC-8004 Parity) =====
  // Check if agent has pre-authorized this facilitator to update reputation
  // This allows agents to grant PayAI permission to update their on-chain reputation
  // without requiring a signature for each payment.
  //
  // TODO: Once Codama generates the authorization instructions:
  // 1. Query on-chain authorization PDA for this agent-facilitator pair
  // 2. If valid authorization exists, use update_reputation_with_auth instruction
  // 3. Record usage in authorization account (increment current_index)
  // 4. Create AuthorizationUsageRecord for audit trail
  //
  // For now, this is a placeholder showing where the authorization check will go.
  const facilitatorAddress = process.env.PAYAI_FACILITATOR_ADDRESS
  if (facilitatorAddress) {
    console.log('[PayAI Webhook] Authorization check (placeholder):', {
      agent: record.agentAddress.toString(),
      facilitator: facilitatorAddress,
      note: 'Will use on-chain authorization once Codama generates instructions',
    })
    // TODO: Implement authorization check and on-chain update here
  }

  // Record on-chain reputation update with retry logic
  try {
    const { retryWithBackoff, retryWithFallback } = await import('@/lib/retry-utils')
    const { switchToFallbackRpc, getCurrentRpcUrl } = await import('@/lib/server-wallet')

    // Try recording with retry + RPC fallback
    const txSignature = await retryWithFallback(
      [
        // Strategy 1: Use current RPC
        () => recordPaymentOnChain(record),

        // Strategy 2: Switch to fallback RPC and retry
        async () => {
          console.log('[PayAI Webhook] Switching to fallback RPC...')
          switchToFallbackRpc()
          return recordPaymentOnChain(record)
        },
      ],
      {
        maxRetries: 2,
        initialDelayMs: 1000,
        onRetry: (error, attempt) => {
          console.warn(`[PayAI Webhook] On-chain recording retry ${attempt}:`, error.message)
        },
      }
    )

    console.log('[PayAI Webhook] On-chain recording successful:', txSignature)
  } catch (error) {
    console.error('[PayAI Webhook] On-chain recording failed after all retries:', error)

    // Report to Sentry if available
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        const Sentry = await import('@sentry/nextjs')
        Sentry.captureException(error, {
          tags: {
            component: 'payai-webhook',
            operation: 'on-chain-recording',
          },
          contexts: {
            payment: {
              agent: record.agentAddress.toString(),
              amount: record.amount.toString(),
              success: record.success,
            },
          },
        })
      } catch (sentryError) {
        console.error('[PayAI Webhook] Failed to report to Sentry:', sentryError)
      }
    }

    // Don't throw - in-memory cache is updated even if on-chain fails
  }

  // Auto-issue credential if tier threshold crossed
  await maybeIssueCredential(record.agentAddress.toString(), entry.overallScore)
}

/**
 * Record payment event on-chain
 *
 * IMPLEMENTATION NOTE:
 * This creates an on-chain log transaction to record the PayAI payment event.
 * In the future, this will be replaced with a proper reputation instruction
 * when on-chain reputation state is fully implemented.
 *
 * Current approach:
 * 1. Create a transaction with a memo instruction containing payment data
 * 2. Sign with server wallet
 * 3. Send to Solana and confirm
 * 4. Return transaction signature as proof
 */
async function recordPaymentOnChain(record: PayAIReputationRecord): Promise<string> {
  try {
    // Import dependencies - using stable @solana/web3.js v1.x API
    const {
      Connection,
      Keypair,
      PublicKey,
      TransactionInstruction,
      TransactionMessage,
      VersionedTransaction,
    } = await import('@solana/web3.js')

    // 1. Get server wallet private key
    const privateKeyBase58 = process.env.PAYMENT_RECORDER_PRIVATE_KEY
    if (!privateKeyBase58) {
      throw new Error('PAYMENT_RECORDER_PRIVATE_KEY not configured')
    }

    const bs58 = await import('bs58')
    const privateKeyBytes = bs58.default.decode(privateKeyBase58)
    const payer = Keypair.fromSecretKey(privateKeyBytes)

    // 2. Create connection
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
    const connection = new Connection(rpcUrl, 'confirmed')

    console.log('[PayAI On-Chain] Recording payment:', {
      agent: record.agentAddress.toString(),
      paymentSignature: record.paymentSignature,
      amount: record.amount.toString(),
      responseTimeMs: record.responseTimeMs,
      success: record.success,
    })

    // 3. Create memo instruction with payment data
    const paymentData = JSON.stringify({
      type: 'payai_payment',
      version: '1.0',
      agent: record.agentAddress.toString(),
      paymentId: record.paymentSignature,
      amount: record.amount.toString(),
      success: record.success,
      responseTimeMs: record.responseTimeMs,
      payer: record.payerAddress,
      timestamp: record.timestamp.toISOString(),
      network: record.network,
    })

    const memoProgramId = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: memoProgramId,
      data: Buffer.from(paymentData, 'utf8'),
    })

    // 4. Get latest blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

    // 5. Create TransactionMessage (v1.x stable API)
    const transactionMessage = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: blockhash,
      instructions: [memoInstruction],
    })

    // 6. Compile to V0 message
    const compiledMessage = transactionMessage.compileToV0Message()

    // 7. Create VersionedTransaction
    const transaction = new VersionedTransaction(compiledMessage)

    // 8. Sign transaction
    transaction.sign([payer])

    // 9. Send and confirm transaction
    console.log('[PayAI On-Chain] Sending transaction to RPC...')

    const signature = await connection.sendTransaction(transaction)

    console.log('[PayAI On-Chain] Transaction sent:', signature)

    // 10. Confirm transaction
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight })

    console.log('[PayAI On-Chain] Transaction confirmed:', signature)

    return signature
  } catch (error) {
    console.error('[PayAI On-Chain] Recording failed:', error)

    // Store in error queue for retry
    await storeFailedRecording(record, error)

    throw error
  }
}


/**
 * Store failed recording for retry
 */
async function storeFailedRecording(record: PayAIReputationRecord, error: any): Promise<void> {
  try {
    // Import Convex client
    const { ConvexHttpClient } = await import('convex/browser')
    const { api } = await import('@/convex/_generated/api')

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

    await convex.mutation(api.payaiRetries.storeFailedRecording, {
      agentAddress: record.agentAddress.toString(),
      paymentSignature: record.paymentSignature,
      amount: record.amount.toString(),
      responseTimeMs: record.responseTimeMs,
      success: record.success,
      payerAddress: record.payerAddress,
      network: record.network,
      error: error instanceof Error ? error.message : String(error),
      timestamp: record.timestamp.getTime(),
    })

    console.log('[PayAI Webhook] Stored failed recording for retry:', {
      paymentSignature: record.paymentSignature,
      agent: record.agentAddress.toString(),
    })
  } catch (storageError) {
    console.error('[PayAI Webhook] Failed to store failed recording:', storageError)
  }
}

/**
 * Issue reputation credential if agent crosses tier threshold
 */
async function maybeIssueCredential(
  agentAddress: string,
  newScore: number
): Promise<void> {
  const tier = getReputationTier(newScore)
  const entry = reputationCache.get(agentAddress)

  if (!entry) return

  // Define tier milestones with metadata
  const milestones = [
    { score: 2000, tier: 'Bronze', credentialType: 'BronzeReputation' },
    { score: 5000, tier: 'Silver', credentialType: 'SilverReputation' },
    { score: 7500, tier: 'Gold', credentialType: 'GoldReputation' },
    { score: 9000, tier: 'Platinum', credentialType: 'PlatinumReputation' },
  ]

  for (const milestone of milestones) {
    // If new score crosses milestone and we haven't issued this credential yet
    if (newScore >= milestone.score && !hasIssuedCredentialForTier(agentAddress, milestone.score)) {
      console.log('[PayAI Webhook] Issuing credential for tier:', {
        agent: agentAddress,
        score: newScore,
        tier: milestone.tier,
        milestone: milestone.score,
      })

      try {
        // Issue credential on-chain with retry logic
        const { retryWithBackoff } = await import('@/lib/retry-utils')

        await retryWithBackoff(
          () => issueReputationCredential(agentAddress, milestone, newScore, entry),
          {
            maxRetries: 3,
            initialDelayMs: 2000,
            maxDelayMs: 10000,
            onRetry: (error, attempt) => {
              console.warn(
                `[PayAI Webhook] Credential issuance retry ${attempt} for ${milestone.tier}:`,
                error.message
              )
            },
          }
        )

        markCredentialIssued(agentAddress, milestone.score)
      } catch (error) {
        console.error('[PayAI Webhook] Credential issuance failed after all retries:', error)

        // Report to Sentry if available
        if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
          try {
            const Sentry = await import('@sentry/nextjs')
            Sentry.captureException(error, {
              tags: {
                component: 'payai-webhook',
                operation: 'credential-issuance',
                tier: milestone.tier,
              },
              contexts: {
                credential: {
                  agent: agentAddress,
                  score: newScore,
                  tier: milestone.tier,
                  milestone: milestone.score,
                },
              },
            })
          } catch (sentryError) {
            console.error('[PayAI Webhook] Failed to report to Sentry:', sentryError)
          }
        }

        // Don't throw - reputation update succeeded even if credential failed
      }
    }
  }
}

/**
 * Issue a reputation credential via Crossmint
 */
async function issueReputationCredential(
  agentAddress: string,
  milestone: { score: number; tier: string; credentialType: string },
  newScore: number,
  entry: ReputationEntry
): Promise<void> {
  try {
    const { CrossmintVCClient } = await import('@ghostspeak/sdk')

    // Initialize Crossmint client
    const crossmint = new CrossmintVCClient({
      apiKey: process.env.CROSSMINT_SECRET_KEY || '', // Server-side secret key
      environment: 'staging', // TODO: Switch to production for mainnet
      chain: 'base-sepolia',
    })

    // Calculate metrics
    const totalJobs = entry.totalJobsCompleted + entry.totalJobsFailed
    const successRate = totalJobs > 0 ? Math.round((entry.totalJobsCompleted / totalJobs) * 100) : 0

    // Calculate total earnings from payment history (in lamports)
    const totalEarnings = entry.paymentHistory
      .filter(p => p.success)
      .reduce((sum, p) => sum + parseInt(p.amount), 0)

    // Build credential subject data matching Crossmint schema
    const subject = {
      agent: agentAddress, // Required: agent address
      reputationScore: newScore, // Required: integer score (0-10000)
      totalJobsCompleted: entry.totalJobsCompleted, // Required: integer
      totalEarnings, // Required: integer (total lamports earned)
      successRate, // Required: integer (0-100)
      avgRating: newScore >= 9000 ? 5 : newScore >= 7500 ? 4 : newScore >= 5000 ? 3 : newScore >= 2000 ? 2 : 1, // Required: 1-5 stars
      disputeRate: 0, // Required: integer (not tracking disputes yet from PayAI)
      snapshotTimestamp: Math.floor(Date.now() / 1000), // Required: unix timestamp
    }

    // Get Crossmint reputation template ID from env
    const templateId = process.env.CROSSMINT_REPUTATION_TEMPLATE_ID

    if (!templateId) {
      throw new Error('CROSSMINT_REPUTATION_TEMPLATE_ID not configured')
    }

    // For agents without email, use a placeholder format
    // In production, agents would link their email to receive credentials
    const recipientEmail = `agent-${agentAddress.slice(0, 8)}@ghostspeak.credentials`

    console.log('[PayAI Webhook] Issuing reputation credential:', {
      tier: milestone.tier,
      score: newScore,
      agent: agentAddress,
      templateId,
    })

    // Issue credential via Crossmint
    const result = await crossmint.issueReputationCredential(
      templateId,
      recipientEmail,
      subject
    )

    console.log('[PayAI Webhook] Credential issued successfully:', {
      credentialId: result.credentialId,
      tier: milestone.tier,
      score: newScore,
      crossmintId: result.id,
      onChainStatus: result.onChain.status,
    })
  } catch (error) {
    console.error('[PayAI Webhook] Failed to issue credential:', error)
    throw error
  }
}

// Track issued credentials per agent (in-memory for now)
const issuedCredentials = new Map<string, Set<number>>()

function hasIssuedCredentialForTier(agent: string, milestone: number): boolean {
  return issuedCredentials.get(agent)?.has(milestone) ?? false
}

function markCredentialIssued(agent: string, milestone: number): void {
  if (!issuedCredentials.has(agent)) {
    issuedCredentials.set(agent, new Set())
  }
  issuedCredentials.get(agent)!.add(milestone)
}

/**
 * Get reputation tier from score
 */
function getReputationTier(score: number): string {
  if (score >= 9000) return 'Platinum'
  if (score >= 7500) return 'Gold'
  if (score >= 5000) return 'Silver'
  if (score >= 2000) return 'Bronze'
  return 'Unranked'
}

// =====================================================
// WEBHOOK HANDLER
// =====================================================

const handler = createPayAIWebhookHandler({
  webhookSecret: WEBHOOK_SECRET,
  verifySignatures: process.env.NODE_ENV === 'production',
  onRecordReputation: recordToReputation,
  onPaymentVerified: async (data) => {
    console.log('[PayAI Webhook] Payment verified:', data.paymentId)
  },
  onPaymentSettled: async (data) => {
    console.log('[PayAI Webhook] Payment settled:', data.paymentId)
  },
  onPaymentFailed: async (data) => {
    console.warn('[PayAI Webhook] Payment failed:', data.paymentId)
  },
})

// =====================================================
// API ROUTE HANDLERS
// =====================================================

/**
 * Handle POST requests from PayAI webhooks
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the raw body
    const body = await request.text()

    // Process the webhook
    const result = await handler.handleWebhook({
      headers: request.headers,
      body,
    })

    if (!result.success) {
      console.error('[PayAI Webhook] Processing failed:', result.error)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Log successful processing
    console.log('[PayAI Webhook] Processed successfully:', {
      eventType: result.eventType,
      paymentId: result.paymentId,
      reputationRecorded: result.reputationRecorded,
    })

    return NextResponse.json({
      success: true,
      eventType: result.eventType,
      reputationRecorded: result.reputationRecorded,
    })
  } catch (error) {
    console.error('[PayAI Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Handle GET requests (for health checks and stats)
 */
export async function GET(): Promise<NextResponse> {
  // Calculate aggregate stats
  let totalAgents = 0
  let totalScore = 0
  let totalJobs = 0

  for (const entry of reputationCache.values()) {
    totalAgents++
    totalScore += entry.overallScore
    totalJobs += entry.totalJobsCompleted + entry.totalJobsFailed
  }

  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/payai/webhook',
    description: 'PayAI webhook endpoint for payment event processing',
    signatureVerification: process.env.NODE_ENV === 'production',
    stats: {
      trackedAgents: totalAgents,
      averageScore: totalAgents > 0 ? Math.round(totalScore / totalAgents) : 0,
      totalPayments: totalJobs,
    },
  })
}
