/**
 * Check $GHOST Token Balance Action
 *
 * Fetches user's $GHOST token balance from Solana and calculates USD value
 * for message tier determination.
 */

import { v } from 'convex/values'
import { action } from './_generated/server'
import { api } from './_generated/api'

// $GHOST token mint address
const GHOST_TOKEN_MINT = 'DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump'
const GHOST_DECIMALS = 9

/**
 * Check user's $GHOST balance and update their message tier
 */
export const checkAndUpdateTier = action({
  args: {
    walletAddress: v.string(),
  },
  handler: async (
    ctx,
    { walletAddress }
  ): Promise<{
    tier: string
    cachedBalanceUsd: number
    limit: number
    thresholds: { holder: number; whale: number }
    ghostBalance?: number
    ghostPriceUsd?: number
  }> => {
    // Check if we need to refresh
    const needsRefresh = await ctx.runQuery(api.messageQuota.needsBalanceRefresh, {
      walletAddress,
    })

    if (!needsRefresh) {
      // Return cached tier
      return await ctx.runQuery(api.messageQuota.getUserTier, { walletAddress })
    }

    try {
      // Fetch token balance from Helius API
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByOwner',
          params: [walletAddress, { mint: GHOST_TOKEN_MINT }, { encoding: 'jsonParsed' }],
        }),
      })

      const data = await response.json()

      let ghostBalance = 0
      if (data.result?.value?.length > 0) {
        const accountInfo = data.result.value[0].account.data.parsed.info
        ghostBalance = accountInfo.tokenAmount.uiAmount || 0
      }

      // Get $GHOST price from Jupiter
      let ghostPriceUsd = 0
      try {
        const priceResponse = await fetch(`https://api.jup.ag/price/v2?ids=${GHOST_TOKEN_MINT}`, {
          headers: { Accept: 'application/json' },
        })
        const priceData = await priceResponse.json()
        ghostPriceUsd = priceData.data?.[GHOST_TOKEN_MINT]?.price || 0
      } catch (e) {
        console.warn('Could not fetch $GHOST price:', e)
        // SAFETY: Do NOT use hardcoded fallback price (can become extremely stale).
        // Instead, skip the tier update and keep existing tier.
        console.log('[MessageTier] Price fetch failed, keeping existing tier.')
        return await ctx.runQuery(api.messageQuota.getUserTier, { walletAddress })
      }

      const ghostBalanceUsd = ghostBalance * ghostPriceUsd

      console.log(
        `[MessageTier] ${walletAddress.slice(0, 8)}: ${ghostBalance} $GHOST = $${ghostBalanceUsd.toFixed(2)}`
      )

      // Update tier in database
      const result = await ctx.runMutation(api.messageQuota.updateMessageTier, {
        walletAddress,
        ghostBalanceUsd,
      })

      return {
        tier: result.tier,
        cachedBalanceUsd: ghostBalanceUsd,
        limit: result.tier === 'whale' ? 999999 : result.tier === 'holder' ? 100 : 3,
        thresholds: { holder: 10, whale: 100 },
        ghostBalance,
        ghostPriceUsd,
      }
    } catch (error) {
      console.error('Error checking $GHOST balance:', error)

      // On error, keep existing tier or default to free
      return await ctx.runQuery(api.messageQuota.getUserTier, { walletAddress })
    }
  },
})
