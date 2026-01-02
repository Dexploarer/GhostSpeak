/**
 * Ghost Discovery Convex Actions
 *
 * Actions can make external RPC calls to Solana blockchain.
 * These are called by cron jobs to discover and track Ghost agents.
 *
 * Discovery methods:
 * 1. Program account polling - Find all Ghost PDAs
 * 2. Transaction monitoring - Detect register/claim events
 * 3. X402 payment correlation - Link payments to Ghost identities
 */

import { internalAction, action } from './_generated/server'
import { internal, api } from './_generated/api'
import { v } from 'convex/values'

/**
 * Known x402 facilitators on Solana
 * These are the payment facilitators we monitor for agent discovery
 */
const KNOWN_FACILITATORS: Record<
  string,
  Array<{
    name: string
    address: string
    description: string
  }>
> = {
  devnet: [
    {
      name: 'X402 Payment Network',
      address: '2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4',
      description: 'X402 facilitator for AI agent payments',
    },
    {
      name: 'CodeNut',
      address: 'HsozMJWWHNADoZRmhDGKzua6XW6NNfNDdQ4CkE9i5wHt',
      description: 'CodeNut x402 facilitator (codenut.ai)',
    },
    {
      name: 'Ultravioleta DAO',
      address: 'F742C4VfFLQ9zRQyithoj5229ZgtX2WqKCSFKgH2EThq',
      description: 'Ultravioleta DAO x402 facilitator',
    },
  ],
  'mainnet-beta': [
    {
      name: 'X402 Payment Network',
      address: '2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4',
      description: 'X402 facilitator for AI agent payments',
    },
    {
      name: 'CodeNut',
      address: 'HsozMJWWHNADoZRmhDGKzua6XW6NNfNDdQ4CkE9i5wHt',
      description: 'CodeNut x402 facilitator (codenut.ai)',
    },
    {
      name: 'Ultravioleta DAO',
      address: 'F742C4VfFLQ9zRQyithoj5229ZgtX2WqKCSFKgH2EThq',
      description: 'Ultravioleta DAO x402 facilitator',
    },
  ],
  testnet: [],
  localnet: [],
}

/**
 * Get all known facilitators for a network
 */
function getKnownFacilitators(network: string): Array<{
  name: string
  address: string
  description: string
}> {
  return KNOWN_FACILITATORS[network] || []
}

/**
 * Poll GhostSpeak program accounts for new agents
 *
 * This action:
 * 1. Fetches all program accounts from GhostSpeak program
 * 2. Parses Ghost account data
 * 3. Calls internal mutations to store discovered agents
 */
export const pollGhostProgramAccounts = internalAction({
  args: {
    programId: v.string(),
    network: v.string(), // 'devnet' | 'mainnet-beta' | 'testnet' | 'localnet'
    batchSize: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean
    discoveredCount: number
    error?: string
    message?: string
  }> => {
    try {
      console.log('[Ghost Discovery] Starting program account polling...')
      console.log('[Ghost Discovery] Program ID:', args.programId)
      console.log('[Ghost Discovery] Network:', args.network)

      // Get RPC URL from environment based on network
      const rpcUrl = getRpcUrl(args.network)
      console.log('[Ghost Discovery] RPC URL:', rpcUrl)

      // Get indexer state to track progress
      const indexerState = await ctx.runQuery(api.ghostDiscovery.getIndexerState, {
        stateKey: `ghost_discovery_${args.network}`,
      })

      const lastSlot = indexerState?.value ? parseInt(indexerState.value) : 0
      console.log('[Ghost Discovery] Last synced slot:', lastSlot)

      // Fetch program accounts from Solana RPC
      const accountsResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getProgramAccounts',
          params: [
            args.programId,
            {
              encoding: 'base64',
              dataSlice: {
                offset: 0,
                length: 0, // Get all data
              },
              filters: [
                {
                  // Filter for Ghost accounts (discriminator-based)
                  memcmp: {
                    offset: 0,
                    bytes: '', // TODO: Add Ghost account discriminator
                  },
                },
              ],
            },
          ],
        }),
      })

      const accountsData = await accountsResponse.json()

      if (accountsData.error) {
        throw new Error(`RPC error: ${JSON.stringify(accountsData.error)}`)
      }

      const accounts = accountsData.result || []
      console.log('[Ghost Discovery] Found', accounts.length, 'program accounts')

      if (accounts.length === 0) {
        return {
          success: true,
          discoveredCount: 0,
          message: 'No new Ghost accounts found',
        }
      }

      // Get current slot for tracking
      const slotResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSlot',
        }),
      })

      const slotData = await slotResponse.json()
      const currentSlot = slotData.result || 0

      // Process each account
      let discoveredCount = 0
      const limit = args.batchSize || 50

      for (let i = 0; i < Math.min(accounts.length, limit); i++) {
        const account = accounts[i]

        try {
          // Parse Ghost account data
          const ghostData = await parseGhostAccount(account)

          if (!ghostData) {
            continue // Invalid account
          }

          // Check if agent already discovered
          const existing = await ctx.runQuery(api.ghostDiscovery.getDiscoveredAgent, {
            ghostAddress: ghostData.address,
          })

          if (existing) {
            console.log('[Ghost Discovery] Agent already discovered:', ghostData.address)
            continue
          }

          // Get first transaction for this account to determine discovery time
          const firstTx = await getFirstTransactionSignature(rpcUrl, ghostData.address)

          // Record discovered agent
          await ctx.runMutation(internal.ghostDiscovery.recordDiscoveredAgent, {
            ghostAddress: ghostData.address,
            firstTxSignature: firstTx.signature,
            firstSeenTimestamp: firstTx.blockTime * 1000,
            discoverySource: 'account_scan',
            facilitatorAddress: ghostData.facilitator,
            slot: currentSlot,
            blockTime: Date.now(),
            metadataFileId: undefined, // Will be populated when metadata is fetched
            ipfsCid: ghostData.ipfsCid,
          })

          console.log('[Ghost Discovery] Recorded new agent:', {
            address: ghostData.address.slice(0, 8),
            facilitator: ghostData.facilitator?.slice(0, 8),
            ipfsCid: ghostData.ipfsCid,
          })

          discoveredCount++
        } catch (error) {
          console.error('[Ghost Discovery] Failed to process account:', account.pubkey, error)
          // Continue with next account
        }
      }

      // Update indexer state
      if (discoveredCount > 0) {
        await ctx.runMutation(internal.ghostDiscovery.updateIndexerState, {
          stateKey: `ghost_discovery_${args.network}`,
          value: currentSlot.toString(),
          network: args.network,
        })
      }

      console.log('[Ghost Discovery] Discovered', discoveredCount, 'new agents')

      return {
        success: true,
        discoveredCount,
        message: `Discovered ${discoveredCount} new agents`,
      }
    } catch (error) {
      console.error('[Ghost Discovery] Polling failed:', error)

      return {
        success: false,
        discoveredCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})

/**
 * Poll GhostSpeak program logs for register/claim events
 *
 * This is more efficient than scanning all accounts as it only processes new events.
 */
export const pollGhostProgramLogs = internalAction({
  args: {
    programId: v.string(),
    network: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean
    discoveredCount: number
    error?: string
  }> => {
    try {
      console.log('[Ghost Discovery] Starting program log polling...')

      const rpcUrl = getRpcUrl(args.network)

      // Get last synced signature
      const indexerState = await ctx.runQuery(api.ghostDiscovery.getIndexerState, {
        stateKey: `ghost_logs_${args.network}`,
      })

      const lastSignature = indexerState?.value || undefined

      // Fetch signatures for program
      const signaturesResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignaturesForAddress',
          params: [
            args.programId,
            {
              limit: 100,
              before: lastSignature,
            },
          ],
        }),
      })

      const signaturesData = await signaturesResponse.json()

      if (signaturesData.error) {
        throw new Error(`RPC error: ${JSON.stringify(signaturesData.error)}`)
      }

      const signatures = signaturesData.result || []
      console.log('[Ghost Discovery] Found', signatures.length, 'new transactions')

      if (signatures.length === 0) {
        return {
          success: true,
          discoveredCount: 0,
        }
      }

      let discoveredCount = 0

      // Process each transaction
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
            console.warn('[Ghost Discovery] Failed to fetch transaction:', sig.signature)
            continue
          }

          const transaction = txData.result

          // Parse Ghost register/claim events from logs
          const events = parseGhostEvents(transaction)

          for (const event of events) {
            if (event.type === 'register') {
              // Check if already discovered
              const existing = await ctx.runQuery(api.ghostDiscovery.getDiscoveredAgent, {
                ghostAddress: event.ghostAddress,
              })

              if (!existing) {
                await ctx.runMutation(internal.ghostDiscovery.recordDiscoveredAgent, {
                  ghostAddress: event.ghostAddress,
                  firstTxSignature: sig.signature,
                  firstSeenTimestamp: transaction.blockTime ? transaction.blockTime * 1000 : Date.now(),
                  discoverySource: 'program_logs',
                  facilitatorAddress: event.facilitator,
                  slot: sig.slot,
                  blockTime: transaction.blockTime || Math.floor(Date.now() / 1000),
                  metadataFileId: undefined,
                  ipfsCid: event.ipfsCid,
                })

                discoveredCount++
              }
            } else if (event.type === 'claim' && event.claimedBy) {
              // Mark agent as claimed
              await ctx.runMutation(internal.ghostDiscovery.markAgentClaimed, {
                ghostAddress: event.ghostAddress,
                claimedBy: event.claimedBy,
              })
            }
          }
        } catch (error) {
          console.error('[Ghost Discovery] Failed to process transaction:', sig.signature, error)
          // Continue with next transaction
        }
      }

      // Update indexer state
      if (signatures.length > 0) {
        await ctx.runMutation(internal.ghostDiscovery.updateIndexerState, {
          stateKey: `ghost_logs_${args.network}`,
          value: signatures[0].signature,
          network: args.network,
        })
      }

      console.log('[Ghost Discovery] Discovered', discoveredCount, 'new agents from logs')

      return {
        success: true,
        discoveredCount,
      }
    } catch (error) {
      console.error('[Ghost Discovery] Log polling failed:', error)

      return {
        success: false,
        discoveredCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})

/**
 * Discover new agents from recent x402 payments
 *
 * This is the primary ongoing discovery mechanism.
 * Scans recent x402 payments and pre-registers merchant addresses as discovered agents.
 */
export const discoverFromX402Payments = internalAction({
  args: {
    facilitatorAddress: v.string(),
    network: v.string(),
    batchSize: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean
    scannedTransactions: number
    discoveredAgents: number
    error?: string
  }> => {
    try {
      console.log('[Ghost Discovery] Discovering agents from x402 payments...')
      console.log('[Ghost Discovery] Facilitator:', args.facilitatorAddress)

      const rpcUrl = getRpcUrl(args.network)
      const batchSize = args.batchSize || 100

      // Get last synced signature from indexer state
      const indexerState = await ctx.runQuery(api.ghostDiscovery.getIndexerState, {
        stateKey: `x402_discovery_${args.network}`,
      })

      const lastSignature = indexerState?.value || undefined

      // Fetch recent signatures
      const signaturesResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignaturesForAddress',
          params: [
            args.facilitatorAddress,
            {
              limit: batchSize,
              before: lastSignature,
            },
          ],
        }),
      })

      const signaturesData = await signaturesResponse.json()

      if (signaturesData.error) {
        throw new Error(`RPC error: ${JSON.stringify(signaturesData.error)}`)
      }

      const signatures = signaturesData.result || []
      console.log('[Ghost Discovery] Found', signatures.length, 'new transactions')

      if (signatures.length === 0) {
        return {
          success: true,
          scannedTransactions: 0,
          discoveredAgents: 0,
        }
      }

      let scannedTransactions = 0
      let discoveredAgents = 0
      const uniqueMerchants = new Set<string>()

      // Process each transaction
      for (const sig of signatures) {
        scannedTransactions++

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
            console.warn('[Ghost Discovery] Failed to fetch transaction:', sig.signature)
            continue
          }

          const transaction = txData.result

          // Parse x402 payment
          const payment = await parseX402Transaction(transaction, sig.signature)

          if (!payment || !payment.success) {
            continue // Only discover from successful payments
          }

          // Skip if already processed this merchant in this batch
          if (uniqueMerchants.has(payment.merchant)) {
            continue
          }

          uniqueMerchants.add(payment.merchant)

          // Check if already discovered
          const existing = await ctx.runQuery(api.ghostDiscovery.getDiscoveredAgent, {
            ghostAddress: payment.merchant,
          })

          if (existing) {
            continue
          }

          // Discover new agent!
          await ctx.runMutation(internal.ghostDiscovery.recordDiscoveredAgent, {
            ghostAddress: payment.merchant,
            firstTxSignature: payment.signature,
            firstSeenTimestamp: payment.timestamp,
            discoverySource: 'x402_payment',
            facilitatorAddress: args.facilitatorAddress,
            slot: sig.slot,
            blockTime: transaction.blockTime || Math.floor(Date.now() / 1000),
            metadataFileId: undefined,
            ipfsCid: undefined,
          })

          discoveredAgents++

          console.log('[Ghost Discovery] New agent discovered:', {
            merchant: payment.merchant.slice(0, 8),
            signature: payment.signature.slice(0, 8),
          })
        } catch (error) {
          console.error('[Ghost Discovery] Failed to process transaction:', sig.signature, error)
        }
      }

      // Update indexer state with latest signature
      if (signatures.length > 0) {
        await ctx.runMutation(internal.ghostDiscovery.updateIndexerState, {
          stateKey: `x402_discovery_${args.network}`,
          value: signatures[0].signature,
          network: args.network,
        })
      }

      console.log('[Ghost Discovery] Discovery complete:', {
        scannedTransactions,
        discoveredAgents,
      })

      return {
        success: true,
        scannedTransactions,
        discoveredAgents,
      }
    } catch (error) {
      console.error('[Ghost Discovery] Discovery failed:', error)

      return {
        success: false,
        scannedTransactions: 0,
        discoveredAgents: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})

/**
 * Fetch and store agent metadata from IPFS
 */
export const fetchAgentMetadata = internalAction({
  args: {
    ghostAddress: v.string(),
    ipfsCid: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean
    fileId?: string
    metadata?: any
    error?: string
  }> => {
    try {
      console.log('[Ghost Discovery] Fetching metadata from IPFS:', args.ipfsCid)

      // Fetch from IPFS gateway
      const ipfsGateway = process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud'
      const metadataUrl = `${ipfsGateway}/ipfs/${args.ipfsCid}`

      const response = await fetch(metadataUrl, {
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })

      if (!response.ok) {
        throw new Error(`IPFS fetch failed: ${response.statusText}`)
      }

      const metadata = await response.json()

      // Store metadata in Convex storage
      const blob = await response.blob()
      const fileId = await ctx.storage.store(blob)

      console.log('[Ghost Discovery] Stored metadata in Convex storage:', fileId)

      // Parse external IDs from metadata
      const externalIds = parseExternalIdsFromMetadata(metadata)

      // Create external ID mappings
      for (const { platform, externalId } of externalIds) {
        try {
          await ctx.runMutation(internal.ghostDiscovery.addExternalIdMapping, {
            ghostAddress: args.ghostAddress,
            platform,
            externalId,
            verified: false, // From metadata = unverified
            discoveredFrom: 'ipfs_metadata',
          })
        } catch (error) {
          console.warn('[Ghost Discovery] Failed to create external ID mapping:', error)
        }
      }

      return {
        success: true,
        fileId: fileId as string,
        metadata,
      }
    } catch (error) {
      console.error('[Ghost Discovery] Metadata fetch failed:', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})

/**
 * Backfill historical Ghost agents from x402 payments
 *
 * Discovers agents by scanning x402 payment history from facilitator.
 * Any merchant address with successful payments is pre-registered as a discovered agent.
 * Agents remain in "discovered" status until they claim their Ghost on-chain.
 */
export const backfillFromX402Payments = internalAction({
  args: {
    facilitatorAddress: v.string(),
    network: v.string(),
    limit: v.optional(v.number()),
    beforeSignature: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean
    totalTransactions: number
    totalMerchants: number
    totalDiscovered: number
    error?: string
  }> => {
    try {
      console.log('[Ghost Backfill] Starting x402 payment backfill...')
      console.log('[Ghost Backfill] Facilitator:', args.facilitatorAddress)
      console.log('[Ghost Backfill] Network:', args.network)

      const rpcUrl = getRpcUrl(args.network)
      const limit = args.limit || 1000 // Scan up to 1000 transactions
      let totalTransactions = 0
      let totalDiscovered = 0

      // Track unique merchant addresses
      const merchantMap = new Map<
        string,
        {
          firstTxSignature: string
          firstSeenTimestamp: number
          slot: number
          blockTime: number
          totalSuccessful: number
        }
      >()

      // Fetch all signatures for facilitator address
      console.log('[Ghost Backfill] Fetching transaction signatures...')
      const signaturesResponse = await fetch(rpcUrl, {
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
              before: args.beforeSignature,
            },
          ],
        }),
      })

      const signaturesData = await signaturesResponse.json()

      if (signaturesData.error) {
        throw new Error(`RPC error: ${JSON.stringify(signaturesData.error)}`)
      }

      const signatures = signaturesData.result || []
      console.log('[Ghost Backfill] Found', signatures.length, 'transactions')

      // Process each transaction
      for (const sig of signatures) {
        totalTransactions++

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
            console.warn('[Ghost Backfill] Failed to fetch transaction:', sig.signature)
            continue
          }

          const transaction = txData.result

          // Parse x402 payment
          const payment = await parseX402Transaction(transaction, sig.signature)

          if (!payment || !payment.success) {
            continue // Only count successful payments
          }

          // Track merchant
          if (!merchantMap.has(payment.merchant)) {
            merchantMap.set(payment.merchant, {
              firstTxSignature: payment.signature,
              firstSeenTimestamp: payment.timestamp,
              slot: sig.slot,
              blockTime: transaction.blockTime || Math.floor(Date.now() / 1000),
              totalSuccessful: 1,
            })
          } else {
            const existing = merchantMap.get(payment.merchant)!
            existing.totalSuccessful++
            // Keep earliest transaction
            if (payment.timestamp < existing.firstSeenTimestamp) {
              existing.firstTxSignature = payment.signature
              existing.firstSeenTimestamp = payment.timestamp
              existing.slot = sig.slot
              existing.blockTime = transaction.blockTime || existing.blockTime
            }
          }

          // Rate limiting - 50ms between transactions
          if (totalTransactions % 10 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 50))
          }
        } catch (error) {
          console.error('[Ghost Backfill] Failed to process transaction:', sig.signature, error)
        }
      }

      console.log('[Ghost Backfill] Found', merchantMap.size, 'unique merchants with successful payments')

      // Register discovered agents
      for (const [merchantAddress, data] of Array.from(merchantMap.entries())) {
        try {
          // Check if already discovered
          const existing = await ctx.runQuery(api.ghostDiscovery.getDiscoveredAgent, {
            ghostAddress: merchantAddress,
          })

          if (existing) {
            console.log('[Ghost Backfill] Merchant already discovered:', merchantAddress.slice(0, 8))
            continue
          }

          // Record discovered agent (pre-registration)
          await ctx.runMutation(internal.ghostDiscovery.recordDiscoveredAgent, {
            ghostAddress: merchantAddress,
            firstTxSignature: data.firstTxSignature,
            firstSeenTimestamp: data.firstSeenTimestamp,
            discoverySource: 'x402_payment',
            facilitatorAddress: args.facilitatorAddress,
            slot: data.slot,
            blockTime: data.blockTime,
            metadataFileId: undefined,
            ipfsCid: undefined, // Will be populated when agent registers metadata
          })

          totalDiscovered++

          console.log('[Ghost Backfill] Discovered agent:', {
            address: merchantAddress.slice(0, 8),
            firstTx: data.firstTxSignature.slice(0, 8),
            successfulPayments: data.totalSuccessful,
          })

          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (error) {
          console.error('[Ghost Backfill] Failed to register merchant:', merchantAddress, error)
        }
      }

      console.log('[Ghost Backfill] Backfill complete:', {
        totalTransactions,
        totalMerchants: merchantMap.size,
        totalDiscovered,
      })

      return {
        success: true,
        totalTransactions,
        totalMerchants: merchantMap.size,
        totalDiscovered,
      }
    } catch (error) {
      console.error('[Ghost Backfill] Backfill failed:', error)

      return {
        success: false,
        totalTransactions: 0,
        totalMerchants: 0,
        totalDiscovered: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})

/**
 * Backfill from ALL known x402 facilitators
 *
 * Iterates through all registered facilitators for the network and discovers agents.
 * This is the comprehensive backfill that should be run to get all x402 agents.
 */
export const backfillAllFacilitators = action({
  args: {
    network: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean
    facilitatorsProcessed: number
    totalAgentsDiscovered: number
    results: Array<{
      facilitatorName: string
      facilitatorAddress: string
      transactionsScanned: number
      agentsDiscovered: number
      error?: string
    }>
    error?: string
  }> => {
    try {
      console.log('[Ghost Backfill All] Starting comprehensive multi-facilitator backfill...')
      console.log('[Ghost Backfill All] Network:', args.network)

      const facilitators = getKnownFacilitators(args.network)

      if (facilitators.length === 0) {
        return {
          success: false,
          facilitatorsProcessed: 0,
          totalAgentsDiscovered: 0,
          results: [],
          error: `No known facilitators for network: ${args.network}`,
        }
      }

      console.log('[Ghost Backfill All] Found', facilitators.length, 'facilitators to process')

      const results: Array<{
        facilitatorName: string
        facilitatorAddress: string
        transactionsScanned: number
        agentsDiscovered: number
        error?: string
      }> = []

      let totalAgentsDiscovered = 0
      let facilitatorsProcessed = 0

      // Process each facilitator
      for (const facilitator of facilitators) {
        console.log('[Ghost Backfill All] Processing facilitator:', facilitator.name)
        console.log('[Ghost Backfill All] Address:', facilitator.address)
        console.log('[Ghost Backfill All] Description:', facilitator.description)

        try {
          // Run backfill for this facilitator
          const result = await ctx.runAction(internal.ghostDiscoveryActions.backfillFromX402Payments, {
            facilitatorAddress: facilitator.address,
            network: args.network,
            limit: args.limit || 1000,
          })

          results.push({
            facilitatorName: facilitator.name,
            facilitatorAddress: facilitator.address,
            transactionsScanned: result.totalTransactions,
            agentsDiscovered: result.totalDiscovered,
            error: result.error,
          })

          if (result.success) {
            totalAgentsDiscovered += result.totalDiscovered
            facilitatorsProcessed++
          }

          console.log('[Ghost Backfill All] Facilitator processed:', {
            name: facilitator.name,
            transactions: result.totalTransactions,
            discovered: result.totalDiscovered,
          })

          // Rate limiting between facilitators
          await new Promise((resolve) => setTimeout(resolve, 2000))
        } catch (error) {
          console.error('[Ghost Backfill All] Failed to process facilitator:', facilitator.name, error)

          results.push({
            facilitatorName: facilitator.name,
            facilitatorAddress: facilitator.address,
            transactionsScanned: 0,
            agentsDiscovered: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      console.log('[Ghost Backfill All] All facilitators processed:', {
        facilitatorsProcessed,
        totalAgentsDiscovered,
      })

      return {
        success: true,
        facilitatorsProcessed,
        totalAgentsDiscovered,
        results,
      }
    } catch (error) {
      console.error('[Ghost Backfill All] Comprehensive backfill failed:', error)

      return {
        success: false,
        facilitatorsProcessed: 0,
        totalAgentsDiscovered: 0,
        results: [],
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
    console.error('[Ghost Backfill] Failed to parse transaction:', error)
    return null
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get validated facilitator address from zauthx402.com database
 */
async function getValidatedFacilitatorAddress(network: string): Promise<string | null> {
  try {
    const response = await fetch('https://zauthx402.com/database', {
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    if (!response.ok) {
      console.error('[Ghost Discovery] Failed to fetch facilitator database:', response.statusText)
      return null
    }

    const data = await response.json()

    // The database should have network-specific facilitator addresses
    // Format: { devnet: { facilitator: "address" }, mainnet: { facilitator: "address" } }
    const networkData = data[network === 'mainnet-beta' ? 'mainnet' : network]

    if (!networkData || !networkData.facilitator) {
      console.error('[Ghost Discovery] No facilitator found for network:', network)
      return null
    }

    console.log('[Ghost Discovery] Validated facilitator:', networkData.facilitator)
    return networkData.facilitator
  } catch (error) {
    console.error('[Ghost Discovery] Failed to validate facilitator:', error)
    return null
  }
}

/**
 * Get RPC URL for network
 */
function getRpcUrl(network: string): string {
  const rpcUrls: Record<string, string> = {
    'mainnet-beta': process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    devnet: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    testnet: 'https://api.testnet.solana.com',
    localnet: 'http://localhost:8899',
  }

  return rpcUrls[network] || rpcUrls.devnet
}

/**
 * Parse Ghost account data from program account
 */
async function parseGhostAccount(account: any): Promise<{
  address: string
  facilitator?: string
  ipfsCid?: string
} | null> {
  try {
    // TODO: Implement actual Borsh deserialization
    // For now, return basic structure
    return {
      address: account.pubkey,
      facilitator: undefined,
      ipfsCid: undefined,
    }
  } catch (error) {
    console.error('[Ghost Discovery] Failed to parse account:', error)
    return null
  }
}

/**
 * Get first transaction signature for an account
 */
async function getFirstTransactionSignature(
  rpcUrl: string,
  address: string
): Promise<{
  signature: string
  blockTime: number
}> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [
          address,
          {
            limit: 1,
          },
        ],
      }),
    })

    const data = await response.json()
    const signatures = data.result || []

    if (signatures.length === 0) {
      return {
        signature: '',
        blockTime: Math.floor(Date.now() / 1000),
      }
    }

    return {
      signature: signatures[0].signature,
      blockTime: signatures[0].blockTime || Math.floor(Date.now() / 1000),
    }
  } catch (error) {
    console.error('[Ghost Discovery] Failed to get first transaction:', error)
    return {
      signature: '',
      blockTime: Math.floor(Date.now() / 1000),
    }
  }
}

/**
 * Parse Ghost register/claim events from transaction logs
 */
function parseGhostEvents(transaction: any): Array<{
  type: 'register' | 'claim'
  ghostAddress: string
  facilitator?: string
  claimedBy?: string
  ipfsCid?: string
}> {
  const events: Array<{
    type: 'register' | 'claim'
    ghostAddress: string
    facilitator?: string
    claimedBy?: string
    ipfsCid?: string
  }> = []

  try {
    const logs = transaction.meta?.logMessages || []

    for (const log of logs) {
      // Parse program logs for Ghost events
      // Format: "Program log: Ghost registered: <address>"
      if (log.includes('Ghost registered:')) {
        const match = log.match(/Ghost registered: ([A-Za-z0-9]+)/)
        if (match) {
          events.push({
            type: 'register',
            ghostAddress: match[1],
          })
        }
      } else if (log.includes('Ghost claimed:')) {
        const match = log.match(/Ghost claimed: ([A-Za-z0-9]+) by ([A-Za-z0-9]+)/)
        if (match) {
          events.push({
            type: 'claim',
            ghostAddress: match[1],
            claimedBy: match[2],
          })
        }
      }
    }
  } catch (error) {
    console.error('[Ghost Discovery] Failed to parse events:', error)
  }

  return events
}

/**
 * Parse external IDs from IPFS metadata
 *
 * Supports various metadata formats:
 * - Standard fields: twitter, github, discord, telegram
 * - Nested fields: socials.twitter, links.github, etc.
 * - URL extraction from website/homepage fields
 */
function parseExternalIdsFromMetadata(metadata: any): Array<{
  platform: string
  externalId: string
}> {
  const externalIds: Array<{ platform: string; externalId: string }> = []

  if (!metadata || typeof metadata !== 'object') {
    return externalIds
  }

  try {
    // Direct field extraction
    const directMappings: Record<string, string> = {
      twitter: 'twitter',
      x: 'twitter',
      github: 'github',
      discord: 'discord',
      telegram: 'telegram',
      x402: 'x402',
      eliza: 'elizaos',
      elizaos: 'elizaos',
    }

    for (const [field, platform] of Object.entries(directMappings)) {
      if (metadata[field] && typeof metadata[field] === 'string') {
        const value = cleanExternalId(metadata[field])
        if (value) {
          externalIds.push({ platform, externalId: value })
        }
      }
    }

    // Nested socials object
    if (metadata.socials && typeof metadata.socials === 'object') {
      for (const [platform, value] of Object.entries(metadata.socials)) {
        if (typeof value === 'string') {
          const cleanValue = cleanExternalId(value)
          if (cleanValue) {
            externalIds.push({ platform: platform.toLowerCase(), externalId: cleanValue })
          }
        }
      }
    }

    // Nested links object
    if (metadata.links && typeof metadata.links === 'object') {
      for (const [platform, value] of Object.entries(metadata.links)) {
        if (typeof value === 'string') {
          const cleanValue = cleanExternalId(value)
          if (cleanValue) {
            externalIds.push({ platform: platform.toLowerCase(), externalId: cleanValue })
          }
        }
      }
    }

    // Extract from URLs
    if (metadata.website || metadata.homepage || metadata.url) {
      const url = metadata.website || metadata.homepage || metadata.url
      const extractedIds = extractIdsFromUrl(url)
      externalIds.push(...extractedIds)
    }
  } catch (error) {
    console.error('[Ghost Discovery] Failed to parse external IDs from metadata:', error)
  }

  // Deduplicate by platform + externalId
  const seen = new Set<string>()
  return externalIds.filter(({ platform, externalId }) => {
    const key = `${platform}:${externalId}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

/**
 * Clean external ID by removing @ symbols, URLs, etc.
 */
function cleanExternalId(value: string): string {
  // Remove @ prefix (common in Twitter handles)
  let cleaned = value.trim().replace(/^@/, '')

  // Extract username from URL if it's a URL
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    const extracted = extractIdsFromUrl(cleaned)
    if (extracted.length > 0) {
      return extracted[0].externalId
    }
  }

  return cleaned
}

/**
 * Extract external IDs from social media URLs
 */
function extractIdsFromUrl(url: string): Array<{
  platform: string
  externalId: string
}> {
  const ids: Array<{ platform: string; externalId: string }> = []

  try {
    if (!url) return ids

    // Twitter/X
    const twitterMatch = url.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/)
    if (twitterMatch) {
      ids.push({ platform: 'twitter', externalId: twitterMatch[1] })
    }

    // GitHub
    const githubMatch = url.match(/github\.com\/([a-zA-Z0-9_-]+)/)
    if (githubMatch) {
      ids.push({ platform: 'github', externalId: githubMatch[1] })
    }

    // Telegram
    const telegramMatch = url.match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)/)
    if (telegramMatch) {
      ids.push({ platform: 'telegram', externalId: telegramMatch[1] })
    }

    // Discord (server invite links - less useful for user identity)
    // Discord user IDs would need to come from metadata directly
  } catch (error) {
    console.error('[Ghost Discovery] Failed to extract IDs from URL:', error)
  }

  return ids
}
