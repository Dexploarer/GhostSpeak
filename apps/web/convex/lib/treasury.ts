/**
 * Treasury & Credits Configuration
 *
 * Central configuration for the API credits system and treasury operations.
 *
 * Key features:
 * - Multi-token payments (USDC, SOL, GHOST)
 * - GHOST token bonus for loyalty
 * - Treasury buyback of GHOST with received funds
 * - Jupiter DEX integration for price fetching
 */

// ─── TREASURY WALLET ─────────────────────────────────────────────────────────

export const TREASURY_WALLET = '12wKg8BnaCRWfiho4kfHRfQQ4c6cjMwtnRUsyMTmKZnD'

// ─── TOKEN ADDRESSES ─────────────────────────────────────────────────────────

export const TOKENS = {
  USDC: {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    symbol: 'USDC',
  },
  SOL: {
    mint: 'So11111111111111111111111111111111111111112', // Wrapped SOL
    decimals: 9,
    symbol: 'SOL',
  },
  GHOST: {
    mint: 'DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump',
    decimals: 6, // Pump.fun tokens typically use 6 decimals
    symbol: 'GHOST',
  },
}

// ─── SUBSCRIPTION TIERS ──────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'developer' | 'growth' | 'enterprise'

export const TIER_CONFIG: Record<
  SubscriptionTier,
  {
    name: string
    monthlyFreeCredits: number
    rateLimit: number // requests per minute
    ghostBonus: number // percentage bonus for GHOST payments (0.1 = 10%)
    pricePerThousandCredits: number // USD
  }
> = {
  free: {
    name: 'Free',
    monthlyFreeCredits: 100,
    rateLimit: 10,
    ghostBonus: 0,
    pricePerThousandCredits: 0.01, // $0.01 per 1K credits
  },
  developer: {
    name: 'Developer',
    monthlyFreeCredits: 5000,
    rateLimit: 60,
    ghostBonus: 0.1, // 10% bonus
    pricePerThousandCredits: 0.008,
  },
  growth: {
    name: 'Growth',
    monthlyFreeCredits: 50000,
    rateLimit: 300,
    ghostBonus: 0.2, // 20% bonus
    pricePerThousandCredits: 0.005,
  },
  enterprise: {
    name: 'Enterprise',
    monthlyFreeCredits: 500000,
    rateLimit: 1000,
    ghostBonus: 0.3, // 30% bonus
    pricePerThousandCredits: 0.003,
  },
}

// ─── CREDIT PACKAGES ─────────────────────────────────────────────────────────

export const CREDIT_PACKAGES = [
  { credits: 1000, label: '1K Credits' },
  { credits: 10000, label: '10K Credits' },
  { credits: 100000, label: '100K Credits' },
  { credits: 1000000, label: '1M Credits' },
]

// ─── JUPITER API ─────────────────────────────────────────────────────────────

export const JUPITER_API = {
  priceUrl: 'https://price.jup.ag/v4/price',
  quoteUrl: 'https://quote-api.jup.ag/v6/quote',
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Calculate credits from payment amount
 */
export function calculateCredits(
  usdValue: number,
  tier: SubscriptionTier,
  paymentToken: 'USDC' | 'SOL' | 'GHOST'
): number {
  const tierConfig = TIER_CONFIG[tier]
  const baseCredits = (usdValue / tierConfig.pricePerThousandCredits) * 1000

  // Apply GHOST bonus if paying with GHOST token
  if (paymentToken === 'GHOST') {
    return Math.floor(baseCredits * (1 + tierConfig.ghostBonus))
  }

  return Math.floor(baseCredits)
}

/**
 * Get monthly free credits for a tier
 */
export function getMonthlyFreeCredits(tier: SubscriptionTier): number {
  return TIER_CONFIG[tier].monthlyFreeCredits
}

/**
 * Get rate limit for a tier
 */
export function getRateLimit(tier: SubscriptionTier): number {
  return TIER_CONFIG[tier].rateLimit
}
