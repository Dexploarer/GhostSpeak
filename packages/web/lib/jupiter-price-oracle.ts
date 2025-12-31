/**
 * Jupiter Price Oracle
 *
 * Fetches live token prices from Jupiter DEX aggregator.
 * Used for GHOST/USDC pricing in API billing.
 */

import { createJupiterApiClient, type QuoteGetRequest } from '@jup-ag/api'
import { GHOST_MINT, USDC_MINTS, GHOST_DECIMALS, USDC_DECIMALS } from './b2b-token-accounts'

// Price cache to avoid hitting Jupiter API too frequently
interface PriceCache {
  price: number
  timestamp: number
}

const priceCache: Map<string, PriceCache> = new Map()
const CACHE_DURATION_MS = 60 * 1000 // 1 minute cache

// Default fallback price (1 GHOST = $0.01 USDC)
const DEFAULT_GHOST_PRICE_USDC = 0.01

// Jupiter API client
const jupiterApi = createJupiterApiClient()

/**
 * Get GHOST/USDC price from Jupiter
 *
 * Uses Jupiter's quote API to get the real-time price.
 * Returns cached price if available and fresh.
 *
 * NOTE: On devnet, there's no GHOST liquidity pool, so we immediately return fallback price.
 */
export async function getGhostPriceInUsdc(network: 'mainnet' | 'devnet' = 'mainnet'): Promise<number> {
  const cacheKey = `ghost-usdc-${network}`

  // Check cache first
  const cached = priceCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.price
  }

  // On devnet, skip Jupiter and use fallback (no liquidity pool exists)
  if (network === 'devnet') {
    console.log('[Jupiter] Devnet mode - using fallback price:', DEFAULT_GHOST_PRICE_USDC)

    // Cache the fallback price for devnet
    priceCache.set(cacheKey, {
      price: DEFAULT_GHOST_PRICE_USDC,
      timestamp: Date.now(),
    })

    return DEFAULT_GHOST_PRICE_USDC
  }

  try {
    // Get USDC mint for the network
    const usdcMint = USDC_MINTS[network]

    // Request a quote for 1000 GHOST -> USDC
    // Using 1000 instead of 1 to get more accurate pricing (avoid rounding errors)
    const amount = 1000 * Math.pow(10, GHOST_DECIMALS) // 1000 GHOST in micro units

    const params: QuoteGetRequest = {
      inputMint: GHOST_MINT,
      outputMint: usdcMint,
      amount,
      slippageBps: 100, // 1% slippage tolerance
    }

    const quote = await jupiterApi.quoteGet(params)

    if (!quote) {
      console.warn('[Jupiter] No quote returned, using fallback price')
      return DEFAULT_GHOST_PRICE_USDC
    }

    // Calculate price from quote
    // Price = outAmount / inAmount (adjusted for decimals)
    const inAmountNum = Number(quote.inAmount) / Math.pow(10, GHOST_DECIMALS)
    const outAmountNum = Number(quote.outAmount) / Math.pow(10, USDC_DECIMALS)

    // Price per 1 GHOST
    const price = outAmountNum / inAmountNum

    // Cache the price
    priceCache.set(cacheKey, {
      price,
      timestamp: Date.now(),
    })

    console.log(`[Jupiter] GHOST/USDC price: ${price} USDC (network: ${network})`)

    return price
  } catch (error) {
    console.error('[Jupiter] Failed to fetch price:', error)
    console.warn('[Jupiter] Using fallback price:', DEFAULT_GHOST_PRICE_USDC)

    // Return cached price if available, otherwise fallback
    if (cached) {
      console.log('[Jupiter] Using stale cached price:', cached.price)
      return cached.price
    }

    return DEFAULT_GHOST_PRICE_USDC
  }
}

/**
 * Get USDC/GHOST price from Jupiter
 *
 * Inverse of getGhostPriceInUsdc - how many GHOST per 1 USDC
 */
export async function getUsdcPriceInGhost(network: 'mainnet' | 'devnet' = 'mainnet'): Promise<number> {
  const ghostPrice = await getGhostPriceInUsdc(network)
  return 1 / ghostPrice
}

/**
 * Clear price cache (useful for testing or forced refresh)
 */
export function clearPriceCache(): void {
  priceCache.clear()
}

/**
 * Get cached price info (for debugging)
 */
export function getCacheInfo(): {
  cached: boolean
  price?: number
  age?: number
} {
  const cached = priceCache.get('ghost-usdc-mainnet')

  if (!cached) {
    return { cached: false }
  }

  return {
    cached: true,
    price: cached.price,
    age: Date.now() - cached.timestamp,
  }
}
