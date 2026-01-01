/**
 * X402 Convex Actions
 *
 * Actions can make external RPC calls to Solana blockchain.
 * These are called by cron jobs to poll for x402 transactions.
 */

import { action } from './_generated/server'
import { internal, api } from './_generated/api'
import { v } from 'convex/values'

/**
 * Poll Solana blockchain for x402 transactions
 *
 * This action:
 * 1. Fetches transaction signatures from Solana RPC
 * 2. Parses x402 payment data
 * 3. Calls internal mutations to update database
 */
export const pollX402Transactions = action({
  args: {
    facilitatorAddress: v.string(),
    batchSize: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean
    syncedCount: number
    lastSignature?: string
    error?: string
    message?: string
  }> => {
    try {
      console.log('[X402 Action] Starting on-chain polling...')
      console.log('[X402 Action] Facilitator:', args.facilitatorAddress)

      // Get RPC URL from environment
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
      console.log('[X402 Action] RPC URL:', rpcUrl)

      // Get sync state to determine where to start
      const syncState: any = await ctx.runQuery(api.x402Indexer.getSyncState, {
        facilitatorAddress: args.facilitatorAddress,
      })

      const lastSignature: string | undefined = syncState?.lastSignature || undefined

      // Fetch signatures from Solana RPC
      const limit = args.batchSize || 10
      const signaturesResponse: Response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignaturesForAddress',
          params: [
            args.facilitatorAddress,
            {
              limit,
              before: lastSignature,
            },
          ],
        }),
      })

      const signaturesData: any = await signaturesResponse.json()

      if (signaturesData.error) {
        throw new Error(`RPC error: ${JSON.stringify(signaturesData.error)}`)
      }

      const signatures: any[] = signaturesData.result || []
      console.log('[X402 Action] Found', signatures.length, 'signatures')

      if (signatures.length === 0) {
        return {
          success: true,
          syncedCount: 0,
          message: 'No new transactions',
        }
      }

      // Process each transaction
      let syncedCount = 0
      for (const sig of signatures) {
        try {
          // Fetch full transaction
          const txResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getTransaction',
              params: [
                sig.signature,
                {
                  encoding: 'jsonParsed',
                  maxSupportedTransactionVersion: 0,
                },
              ],
            }),
          })

          const txData = await txResponse.json()

          if (txData.error || !txData.result) {
            console.warn('[X402 Action] Failed to fetch transaction:', sig.signature)
            continue
          }

          const transaction = txData.result

          // Parse x402 payment from transaction
          const payment = await parseX402Transaction(transaction, sig.signature)

          if (!payment) {
            continue // Not an x402 payment
          }

          // Record event in database
          await ctx.runMutation(internal.x402Indexer.recordOnChainPayment, {
            signature: payment.signature,
            facilitatorAddress: args.facilitatorAddress,
            merchantAddress: payment.merchant,
            payerAddress: payment.payer,
            amount: payment.amount,
            success: payment.success,
            timestamp: payment.timestamp,
          })

          // Update reputation from on-chain payment
          // NOTE: responseTimeMs is not available from on-chain data, so we use a default value
          // Webhooks provide actual response time, on-chain polling uses 0 (neutral impact)
          const reputationResult = await ctx.runMutation(
            internal.payaiReputation.updateFromPayment,
            {
              merchantAddress: payment.merchant,
              paymentSignature: payment.signature,
              amount: payment.amount,
              success: payment.success,
              responseTimeMs: 0, // On-chain doesn't have response time data
              timestamp: payment.timestamp,
            }
          )

          console.log('[X402 Action] Reputation updated:', {
            merchant: payment.merchant.slice(0, 8),
            previousScore: reputationResult.previousScore,
            newScore: reputationResult.newScore,
            change: reputationResult.reputationChange,
            tier: reputationResult.tier,
          })

          syncedCount++
        } catch (error) {
          console.error('[X402 Action] Failed to process transaction:', sig.signature, error)
          // Continue with next transaction
        }
      }

      // Update sync state
      if (syncedCount > 0) {
        await ctx.runMutation(internal.x402Indexer.updateSyncStateFromAction, {
          facilitatorAddress: args.facilitatorAddress,
          lastSignature: signatures[0].signature,
          syncedCount,
        })
      }

      console.log('[X402 Action] Synced', syncedCount, 'transactions')

      return {
        success: true,
        syncedCount,
        lastSignature: signatures.length > 0 ? signatures[0].signature : undefined,
      }
    } catch (error) {
      console.error('[X402 Action] Polling failed:', error)

      return {
        success: false,
        syncedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})

/**
 * Parse x402 payment from transaction data
 */
async function parseX402Transaction(
  transaction: any,
  signature: string
): Promise<{
  signature: string
  merchant: string
  payer: string
  amount: string
  success: boolean
  timestamp: number
} | null> {
  try {
    const instructions = transaction.transaction?.message?.instructions || []

    // Find SPL token transfer instruction
    const transferIx = instructions.find((ix: any) => {
      const programId = ix.program
      const isTokenProgram = programId === 'spl-token' || programId === 'spl-token-2022'

      if (!isTokenProgram) return false

      const parsed = ix.parsed
      return parsed?.type === 'transfer' || parsed?.type === 'transferChecked'
    })

    if (!transferIx) {
      return null // Not a token transfer
    }

    const transferInfo = transferIx.parsed.info

    return {
      signature,
      merchant: transferInfo.destination,
      payer: transferInfo.source || transferInfo.authority,
      amount: transferInfo.amount || transferInfo.tokenAmount?.amount || '0',
      success: transaction.meta?.err === null,
      timestamp: transaction.blockTime ? transaction.blockTime * 1000 : Date.now(),
    }
  } catch (error) {
    console.error('[X402 Action] Failed to parse transaction:', error)
    return null
  }
}
