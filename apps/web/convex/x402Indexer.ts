/**
 * X402 Indexer - Convex Actions
 *
 * Polls Solana blockchain for x402 payment transactions and stores discovered agents.
 *
 * Supports both SPL token transfers (USDC) and native SOL transfers on devnet and mainnet.
 *
 * Uses shared logic from convex/lib/x402Util.ts
 */

'use node'

import { action } from './_generated/server'
import { internal, api } from './_generated/api'
import { v } from 'convex/values'
import { parseTransactionForPayment } from './lib/x402Util'

/**
 * Poll for x402 transactions and store discovered agents
 */
export const pollX402Transactions = action({
  args: {
    facilitatorAddress: v.optional(v.string()),
    facilitatorAta: v.optional(v.string()), // New: Support SPL ATA
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // Get configuration from environment
      // Use X402_SOLANA_RPC_URL for mainnet x402 discovery (separate from devnet GhostSpeak)
      const rpcUrl =
        process.env.X402_SOLANA_RPC_URL ||
        process.env.SOLANA_RPC_URL ||
        'https://api.mainnet-beta.solana.com'
      const facilitatorAddr =
        args.facilitatorAddress ||
        process.env.GHOSTSPEAK_MERCHANT_ADDRESS ||
        '2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4' // PayAI mainnet facilitator

      console.log(`[X402 Indexer Action] Starting poll...`)
      console.log(`  RPC: ${rpcUrl}`)
      console.log(`  Facilitator: ${facilitatorAddr}`)

      const { createSolanaRpc } = await import('@solana/rpc')
      const { address } = await import('@solana/addresses')

      const rpc = createSolanaRpc(rpcUrl)
      const facilitatorAddress = address(facilitatorAddr)
      const network = rpcUrl.includes('devnet') ? 'solana-devnet' : 'solana'

      const lastState = await ctx.runQuery(api.ghostDiscovery.getIndexerState, {
        stateKey: `x402_last_signature_${facilitatorAddr}`,
      })

      const lastSignature = lastState?.value

      const config: { limit: number; before?: any } = {
        limit: args.limit || 5,
      }

      if (lastSignature) {
        config.before = lastSignature
      }

      const signatures = await rpc.getSignaturesForAddress(facilitatorAddress, config as any).send()
      console.log(`[X402 Indexer Action] Found ${signatures.length} transactions`)

      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

      const fetchWithBackoff = async <T>(
        fn: () => Promise<T>,
        maxRetries = 3,
        baseDelayMs = 2000
      ): Promise<T | null> => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            return await fn()
          } catch (error: unknown) {
            const isRateLimit =
              error instanceof Error &&
              (error.message.includes('429') || error.message.includes('Too Many Requests'))

            if (isRateLimit && attempt < maxRetries) {
              const delayMs = baseDelayMs * Math.pow(2, attempt) // 2s, 4s, 8s
              await sleep(delayMs)
            } else {
              throw error
            }
          }
        }
        return null
      }

      const discovered: string[] = []
      const RATE_LIMIT_DELAY_MS = 2000

      for (const sig of signatures) {
        try {
          await sleep(RATE_LIMIT_DELAY_MS)

          const response = await fetchWithBackoff(() =>
            rpc
              .getTransaction(sig.signature, {
                maxSupportedTransactionVersion: 0,
                encoding: 'jsonParsed',
              })
              .send()
          )

          if (!response || !response.transaction) {
            continue
          }

          const blockTime = response.blockTime ? Number(response.blockTime) : null
          const payment = parseTransactionForPayment(
            response.transaction,
            facilitatorAddr,
            blockTime,
            args.facilitatorAta
          )

          if (!payment.isX402Payment || !payment.payer) {
            continue
          }

          const success = response.meta?.err === null
          if (!success) {
            continue
          }

          await ctx.runMutation(internal.ghostDiscovery.recordDiscoveredAgent, {
            ghostAddress: payment.payer,
            firstTxSignature: sig.signature,
            firstSeenTimestamp: payment.timestamp,
            discoverySource: 'x402_payment',
            facilitatorAddress: facilitatorAddr,
            slot: Number(sig.slot),
            blockTime: Math.floor(payment.timestamp / 1000),
            metadataFileId: undefined,
            ipfsCid: undefined,
            paymentAmount: payment.amount,
            paymentSignature: sig.signature,
          })

          discovered.push(payment.payer)
          console.log(
            `[X402 Indexer Action] Discovered: ${payment.payer} (${payment.amount} lamports)`
          )
        } catch (error) {
          console.error(
            `[X402 Indexer Action] Failed to process transaction ${sig.signature}:`,
            error
          )
        }
      }

      if (signatures.length > 0) {
        const latestSignature = signatures[0].signature
        await ctx.runMutation(internal.ghostDiscovery.updateIndexerState, {
          stateKey: `x402_last_signature_${facilitatorAddr}`,
          value: latestSignature,
          network,
        })
      }

      return {
        success: true,
        totalPayments: discovered.length,
        discovered: discovered.length,
        agents: discovered,
      }
    } catch (error) {
      console.error('[X402 Indexer Action] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        totalPayments: 0,
        discovered: 0,
      }
    }
  },
})

/**
 * Parse a specific transaction signature
 */
export const parseX402Transaction = action({
  args: {
    signature: v.string(),
    facilitatorAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const rpcUrl =
        process.env.X402_SOLANA_RPC_URL ||
        process.env.SOLANA_RPC_URL ||
        'https://api.mainnet-beta.solana.com'
      const facilitatorAddr =
        args.facilitatorAddress ||
        process.env.GHOSTSPEAK_MERCHANT_ADDRESS ||
        '2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4'

      const { createSolanaRpc } = await import('@solana/rpc')
      const rpc = createSolanaRpc(rpcUrl)
      const network = rpcUrl.includes('devnet') ? 'solana-devnet' : 'solana'

      const response = await rpc
        .getTransaction(args.signature as any, {
          maxSupportedTransactionVersion: 0,
          encoding: 'jsonParsed',
        })
        .send()

      if (!response || !response.transaction) {
        return { success: false, error: 'Transaction not found' }
      }

      const blockTime = response.blockTime ? Number(response.blockTime) : null
      const payment = parseTransactionForPayment(response.transaction, facilitatorAddr, blockTime)

      if (!payment.isX402Payment || !payment.payer) {
        return { success: false, error: 'Transaction is not an x402 payment' }
      }

      const success = response.meta?.err === null
      if (!success) {
        return { success: false, error: 'Transaction failed' }
      }

      await ctx.runMutation(internal.ghostDiscovery.recordDiscoveredAgent, {
        ghostAddress: payment.payer,
        firstTxSignature: args.signature,
        firstSeenTimestamp: payment.timestamp,
        discoverySource: 'x402_payment',
        facilitatorAddress: facilitatorAddr,
        slot: Number(response.slot || 0n),
        blockTime: Math.floor(payment.timestamp / 1000),
        metadataFileId: undefined,
        ipfsCid: undefined,
      })

      return {
        success: true,
        payment: {
          signature: args.signature,
          payer: payment.payer,
          merchant: facilitatorAddr,
          amount: payment.amount,
          timestamp: payment.timestamp,
          network,
          metadata: payment.metadata,
        },
      }
    } catch (error) {
      console.error('[X402 Parse Transaction] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
})
