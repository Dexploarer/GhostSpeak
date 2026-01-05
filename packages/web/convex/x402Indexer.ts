/**
 * X402 Indexer - Convex Actions
 *
 * Polls Solana blockchain for x402 payment transactions and stores discovered agents.
 *
 * Supports both SPL token transfers (USDC) and native SOL transfers on devnet and mainnet.
 *
 * NOTE: This implementation inlines the X402TransactionIndexer logic to avoid
 * the SDK bundling issue with Convex. Once the SDK is published to npm with
 * SOL transfer support, we can switch back to using the SDK.
 */

'use node'

import { action } from './_generated/server'
import { internal, api } from './_generated/api'
import { v } from 'convex/values'

/**
 * Poll for x402 transactions and store discovered agents
 */
export const pollX402Transactions = action({
  args: {
    facilitatorAddress: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // Get configuration from environment
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
      const facilitatorAddr =
        args.facilitatorAddress ||
        process.env.GHOSTSPEAK_MERCHANT_ADDRESS ||
        '12wKg8BnaCRWfiho4kfHRfQQ4c6cjMwtnRUsyMTmKZnD' // PayAI test merchant

      console.log(`[X402 Indexer Action] Starting poll...`)
      console.log(`  RPC: ${rpcUrl}`)
      console.log(`  Facilitator: ${facilitatorAddr}`)

      // Import Solana SDK (only needs @solana/rpc and @solana/addresses)
      const { createSolanaRpc } = await import('@solana/rpc')
      const { address } = await import('@solana/addresses')

      // Create RPC client
      const rpc = createSolanaRpc(rpcUrl)
      const facilitatorAddress = address(facilitatorAddr)
      const network = rpcUrl.includes('devnet') ? 'solana-devnet' : 'solana'

      // Get last synced signature from state
      const lastState = await ctx.runQuery(api.ghostDiscovery.getIndexerState, {
        stateKey: `x402_last_signature_${facilitatorAddr}`,
      })

      const lastSignature = lastState?.value

      console.log(`[X402 Indexer Action] Last signature: ${lastSignature || 'none'}`)

      // Fetch transaction signatures
      const config: { limit: number; before?: any } = {
        limit: args.limit || 100,
      }

      if (lastSignature) {
        config.before = lastSignature
      }

      const signatures = await rpc
        .getSignaturesForAddress(facilitatorAddress, config as any)
        .send()

      console.log(`[X402 Indexer Action] Found ${signatures.length} transactions`)

      // Process each transaction
      const discovered: string[] = []

      for (const sig of signatures) {
        try {
          // Fetch full transaction data
          const response = await rpc
            .getTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0,
              encoding: 'jsonParsed',
            })
            .send()

          if (!response || !response.transaction) {
            continue
          }

          const instructions = response.transaction?.message?.instructions || []

          // Check if this is an x402 payment (SPL token or SOL transfer to facilitator)
          let isX402Payment = false
          let transferIx: any = null

          for (const ix of instructions) {
            const programId = (ix as any).programId?.toString()

            // Check for SPL token transfer (USDC on mainnet/devnet)
            const isTokenProgram =
              programId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' || // SPL Token
              programId === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb' // Token-2022

            if (isTokenProgram) {
              const parsed = (ix as any).parsed
              if (parsed?.type === 'transfer' || parsed?.type === 'transferChecked') {
                const destination = parsed.info?.destination
                if (destination === facilitatorAddr) {
                  isX402Payment = true
                  transferIx = ix
                  break
                }
              }
            }

            // Check for system transfer (SOL on devnet and mainnet)
            if (programId === '11111111111111111111111111111111') {
              const parsed = (ix as any).parsed
              if (parsed?.type === 'transfer') {
                const destination = parsed.info?.destination
                if (destination === facilitatorAddr) {
                  isX402Payment = true
                  transferIx = ix
                  break
                }
              }
            }
          }

          if (!isX402Payment || !transferIx) {
            continue
          }

          // Extract payment data
          const transferInfo = transferIx.parsed.info
          const payerAddress = transferInfo.source
          const amount = transferInfo.amount || transferInfo.tokenAmount?.amount || transferInfo.lamports || '0'
          const success = response.meta?.err === null

          if (!success) {
            continue // Skip failed transactions
          }

          // Extract timestamp (convert BigInt to number)
          const blockTime = response.blockTime ? Number(response.blockTime) : null
          const timestamp = blockTime ? blockTime * 1000 : Date.now()

          // Look for memo instruction (optional metadata)
          const memoIx = instructions.find((ix: any) =>
            ix.programId?.toString()?.includes('Memo')
          )

          let metadata: Record<string, unknown> | undefined

          if (memoIx) {
            try {
              // Memo data can be in parsed field or data field
              let memoText: string
              if ((memoIx as any).parsed) {
                memoText = (memoIx as any).parsed
              } else {
                memoText = ''
              }

              if (memoText) {
                metadata = JSON.parse(memoText)
              }
            } catch {
              // Memo is not JSON, ignore
            }
          }

          // Store discovered agent
          await ctx.runMutation(internal.ghostDiscovery.recordDiscoveredAgent, {
            ghostAddress: payerAddress,
            firstTxSignature: sig.signature,
            firstSeenTimestamp: timestamp,
            discoverySource: 'x402_payment',
            facilitatorAddress: facilitatorAddr,
            slot: Number(sig.slot),
            blockTime: blockTime || Math.floor(timestamp / 1000),
            metadataFileId: undefined,
            ipfsCid: undefined,
          })

          discovered.push(payerAddress)

          console.log(`[X402 Indexer Action] Discovered: ${payerAddress} (${amount} lamports)`)
        } catch (error) {
          console.error(`[X402 Indexer Action] Failed to process transaction ${sig.signature}:`, error)
          // Continue processing other transactions
        }
      }

      // Update last synced signature
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
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
      const facilitatorAddr =
        args.facilitatorAddress ||
        process.env.GHOSTSPEAK_MERCHANT_ADDRESS ||
        '12wKg8BnaCRWfiho4kfHRfQQ4c6cjMwtnRUsyMTmKZnD'

      // Import Solana SDK
      const { createSolanaRpc } = await import('@solana/rpc')

      const rpc = createSolanaRpc(rpcUrl)
      const network = rpcUrl.includes('devnet') ? 'solana-devnet' : 'solana'

      // Fetch full transaction data
      const response = await rpc
        .getTransaction(args.signature as any, {
          maxSupportedTransactionVersion: 0,
          encoding: 'jsonParsed',
        })
        .send()

      if (!response || !response.transaction) {
        return {
          success: false,
          error: 'Transaction not found',
        }
      }

      const instructions = response.transaction?.message?.instructions || []

      // Check if this is an x402 payment
      let isX402Payment = false
      let transferIx: any = null

      for (const ix of instructions) {
        const programId = (ix as any).programId?.toString()

        // Check for SPL token transfer (USDC on mainnet/devnet)
        const isTokenProgram =
          programId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' ||
          programId === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'

        if (isTokenProgram) {
          const parsed = (ix as any).parsed
          if (parsed?.type === 'transfer' || parsed?.type === 'transferChecked') {
            const destination = parsed.info?.destination
            if (destination === facilitatorAddr) {
              isX402Payment = true
              transferIx = ix
              break
            }
          }
        }

        // Check for system transfer (SOL on devnet and mainnet)
        if (programId === '11111111111111111111111111111111') {
          const parsed = (ix as any).parsed
          if (parsed?.type === 'transfer') {
            const destination = parsed.info?.destination
            if (destination === facilitatorAddr) {
              isX402Payment = true
              transferIx = ix
              break
            }
          }
        }
      }

      if (!isX402Payment || !transferIx) {
        return {
          success: false,
          error: 'Transaction is not an x402 payment',
        }
      }

      // Extract payment data
      const transferInfo = (transferIx as any).parsed.info
      const payerAddress = transferInfo.source
      const amount = transferInfo.amount || transferInfo.tokenAmount?.amount || transferInfo.lamports || '0'
      const success = response.meta?.err === null

      if (!success) {
        return {
          success: false,
          error: 'Transaction failed',
        }
      }

      // Extract timestamp (convert BigInt to number)
      const blockTime = response.blockTime ? Number(response.blockTime) : null
      const timestamp = blockTime ? blockTime * 1000 : Date.now()

      // Look for memo
      const memoIx = instructions.find((ix: any) =>
        ix.programId?.toString()?.includes('Memo')
      )

      let metadata: Record<string, unknown> | undefined

      if (memoIx) {
        try {
          let memoText: string
          if ((memoIx as any).parsed) {
            memoText = (memoIx as any).parsed
          } else {
            memoText = ''
          }

          if (memoText) {
            metadata = JSON.parse(memoText)
          }
        } catch {
          // Memo is not JSON, ignore
        }
      }

      // Store discovered agent
      await ctx.runMutation(internal.ghostDiscovery.recordDiscoveredAgent, {
        ghostAddress: payerAddress,
        firstTxSignature: args.signature,
        firstSeenTimestamp: timestamp,
        discoverySource: 'x402_payment',
        facilitatorAddress: facilitatorAddr,
        slot: Number(response.slot || 0n),
        blockTime: blockTime || Math.floor(timestamp / 1000),
        metadataFileId: undefined,
        ipfsCid: undefined,
      })

      return {
        success: true,
        payment: {
          signature: args.signature,
          payer: payerAddress,
          merchant: facilitatorAddr,
          amount,
          timestamp,
          network,
          metadata,
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
