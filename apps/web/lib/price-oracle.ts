/**
 * Price Oracle Service
 *
 * Fetches real-time token prices from Jupiter API
 * Falls back to CoinGecko if Jupiter is unavailable
 */

// Token mint addresses on Solana
const TOKEN_MINTS = {
  SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  GHOST: process.env.NEXT_PUBLIC_GHOST_TOKEN_MINT || 'BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh', // GHOST token
} as const

// Jupiter Price API v4 endpoint (v6 is timing out)
const JUPITER_PRICE_API = 'https://price.jup.ag/v4/price'

// CoinGecko API as fallback
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price'

// Cache prices for 60 seconds to avoid rate limits
const PRICE_CACHE_TTL_MS = 60 * 1000
const priceCache: Map<string, { price: number; timestamp: number }> = new Map()

export interface TokenPrice {
  token: string
  price: number // Price in USD
  source: 'jupiter' | 'coingecko' | 'cache' | 'fallback'
  timestamp: number
}

/**
 * Get current prices for multiple tokens
 */
export async function getTokenPrices(
  tokens: ('SOL' | 'USDC' | 'GHOST')[]
): Promise<Record<string, TokenPrice>> {
  const now = Date.now()
  const result: Record<string, TokenPrice> = {}
  const tokensToFetch: string[] = []

  // Check cache first
  for (const token of tokens) {
    const cached = priceCache.get(token)
    if (cached && now - cached.timestamp < PRICE_CACHE_TTL_MS) {
      result[token] = {
        token,
        price: cached.price,
        source: 'cache',
        timestamp: cached.timestamp,
      }
    } else {
      tokensToFetch.push(token)
    }
  }

  // If all prices are cached, return immediately
  if (tokensToFetch.length === 0) {
    return result
  }

  // Try Jupiter API first
  try {
    const jupiterPrices = await fetchJupiterPrices(tokensToFetch as ('SOL' | 'USDC' | 'GHOST')[])
    for (const [token, price] of Object.entries(jupiterPrices)) {
      result[token] = price
      priceCache.set(token, { price: price.price, timestamp: now })
    }
    return result
  } catch (error) {
    console.error('Jupiter API failed, trying CoinGecko:', error)
  }

  // Fallback to CoinGecko
  try {
    const coingeckoPrices = await fetchCoinGeckoPrices(
      tokensToFetch as ('SOL' | 'USDC' | 'GHOST')[]
    )
    for (const [token, price] of Object.entries(coingeckoPrices)) {
      result[token] = price
      priceCache.set(token, { price: price.price, timestamp: now })
    }
    return result
  } catch (error) {
    console.error('CoinGecko API also failed:', error)
  }

  // If both APIs fail, use hardcoded fallback prices
  for (const token of tokensToFetch) {
    result[token] = getFallbackPrice(token as 'SOL' | 'USDC' | 'GHOST')
  }

  return result
}

/**
 * Fetch prices from Jupiter API
 */
async function fetchJupiterPrices(
  tokens: ('SOL' | 'USDC' | 'GHOST')[]
): Promise<Record<string, TokenPrice>> {
  const mints = tokens.map((t) => TOKEN_MINTS[t])
  const url = `${JUPITER_PRICE_API}?ids=${mints.join(',')}`

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(5000), // 5 second timeout
  })

  if (!response.ok) {
    throw new Error(`Jupiter API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  const result: Record<string, TokenPrice> = {}
  const now = Date.now()

  for (const token of tokens) {
    const mint = TOKEN_MINTS[token]
    const priceData = data.data?.[mint]

    if (priceData && typeof priceData.price === 'number') {
      result[token] = {
        token,
        price: priceData.price,
        source: 'jupiter',
        timestamp: now,
      }
    } else {
      throw new Error(`No price data for ${token} from Jupiter`)
    }
  }

  return result
}

/**
 * Fetch prices from CoinGecko API (fallback)
 */
async function fetchCoinGeckoPrices(
  tokens: ('SOL' | 'USDC' | 'GHOST')[]
): Promise<Record<string, TokenPrice>> {
  // Map token symbols to CoinGecko IDs
  const geckoIds: Record<string, string> = {
    SOL: 'solana',
    USDC: 'usd-coin',
    GHOST: 'ghost-token', // Adjust if GHOST has a different ID
  }

  const ids = tokens
    .map((t) => geckoIds[t])
    .filter(Boolean)
    .join(',')
  const url = `${COINGECKO_API}?ids=${ids}&vs_currencies=usd`

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(5000), // 5 second timeout
  })

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  const result: Record<string, TokenPrice> = {}
  const now = Date.now()

  for (const token of tokens) {
    const geckoId = geckoIds[token]
    const price = data[geckoId]?.usd

    if (typeof price === 'number') {
      result[token] = {
        token,
        price,
        source: 'coingecko',
        timestamp: now,
      }
    } else {
      throw new Error(`No price data for ${token} from CoinGecko`)
    }
  }

  return result
}

/**
 * Get hardcoded fallback prices (used when all APIs fail)
 */
function getFallbackPrice(token: 'SOL' | 'USDC' | 'GHOST'): TokenPrice {
  const fallbackPrices: Record<string, number> = {
    SOL: 150, // Approximate SOL price
    USDC: 1, // USDC is pegged to $1
    GHOST: 0.00001, // Approximate GHOST price
  }

  return {
    token,
    price: fallbackPrices[token],
    source: 'fallback',
    timestamp: Date.now(),
  }
}

/**
 * Get single token price
 */
export async function getTokenPrice(token: 'SOL' | 'USDC' | 'GHOST'): Promise<TokenPrice> {
  const prices = await getTokenPrices([token])
  return prices[token]
}

/**
 * Convert token amount to USD value
 */
export async function convertToUSD(
  amount: number,
  token: 'SOL' | 'USDC' | 'GHOST'
): Promise<number> {
  if (token === 'USDC') {
    return amount // USDC is 1:1 with USD
  }

  const price = await getTokenPrice(token)
  return amount * price.price
}

/**
 * Clear price cache (useful for testing)
 */
export function clearPriceCache(): void {
  priceCache.clear()
}
