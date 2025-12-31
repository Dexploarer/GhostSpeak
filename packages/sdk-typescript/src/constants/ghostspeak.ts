/**
 * GhostSpeak Protocol Constants
 * July 2025 Implementation
 */

import { address } from '@solana/addresses'

/**
 * Program ID for GhostSpeak Marketplace on Solana
 * Deployed on devnet - December 30, 2025
 * Deployment signature: 5zdU8HdtenhgwDmeEJu2ZPrQwoG9gztHHM5Ft6URxCzTj7m4y9ZkvmVKrpvMK41skcHvh8xa7ckNuUkQwPsierJr
 */
export const GHOSTSPEAK_PROGRAM_ID = address('4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB')

/**
 * Network-specific configurations
 */
export const NETWORK_CONFIG = {
  devnet: {
    programId: '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB',
    rpcUrl: 'https://api.devnet.solana.com'
  },
  testnet: {
    programId: '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB',
    rpcUrl: 'https://api.testnet.solana.com'
  },
  mainnet: {
    programId: '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB', // TODO: Update with mainnet deployment
    rpcUrl: 'https://api.mainnet-beta.solana.com'
  }
} as const

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  network: 'devnet' as keyof typeof NETWORK_CONFIG,
  confirmations: 1,
  timeout: 30000,
  maxRetries: 3
} as const

/**
 * GHOST Token Configuration
 * Official GhostSpeak utility token launched December 26, 2025
 * Deployed on pump.fun with immutable supply
 */

/**
 * GHOST Token Mint Address (Solana Mainnet)
 * - Mint Authority: REVOKED (immutable supply)
 * - Freeze Authority: REVOKED (decentralized)
 * - Supply: ~999.75M GHOST (fixed)
 */
export const GHOST_TOKEN_MINT = address('DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump')

/**
 * GHOST Token Metadata
 */
export const GHOST_TOKEN_CONFIG = {
  /** Token mint address */
  mint: GHOST_TOKEN_MINT,
  /** Token symbol */
  symbol: 'GHOST',
  /** Token name */
  name: 'Ghostspeak',
  /** Token decimals (1 GHOST = 1_000_000 lamports) */
  decimals: 6,
  /** Total supply in lamports */
  supplyLamports: 999753007258579n,
  /** Total supply in tokens */
  supplyTokens: 999753007.258579,
  /** Mint authority (null = immutable) */
  mintAuthority: null,
  /** Freeze authority (null = decentralized) */
  freezeAuthority: null,
  /** Primary DEX pair */
  dexPair: 'https://dexscreener.com/solana/e44xj7jyjxyermlqqwrpu4nekcphawfjf3ppn2uokgdb',
  /** Launch date */
  launchedAt: new Date('2025-12-26'),
} as const

/**
 * Staking Tier Requirements (in GHOST tokens with 6 decimals)
 */
export const STAKING_TIERS = {
  /** Basic Staker: 1,000 GHOST */
  BASIC: {
    name: 'Basic Staker',
    required: 1_000_000_000_000n, // 1,000 GHOST (6 decimals)
    multiplier: 1.0,
    benefits: [
      'Proportional revenue share',
      'Vote on protocol parameters',
      'Public staking dashboard access'
    ]
  },
  /** Verified Staker: 5,000 GHOST */
  VERIFIED: {
    name: 'Verified Staker',
    required: 5_000_000_000_000n, // 5,000 GHOST (6 decimals)
    multiplier: 1.5,
    benefits: [
      'All Basic benefits',
      'Unlimited agent verifications',
      '"Verified Reviewer" badge (2x review weight)',
      'Early feature access'
    ]
  },
  /** Pro Staker: 50,000 GHOST */
  PRO: {
    name: 'Pro Staker',
    required: 50_000_000_000_000n, // 50,000 GHOST (6 decimals)
    multiplier: 2.0,
    benefits: [
      'All Verified benefits',
      'API access (100K requests/month)',
      'Webhook notifications',
      'Priority support',
      'Governance voting power (2x)'
    ]
  },
  /** Whale Staker: 500,000 GHOST */
  WHALE: {
    name: 'Whale Staker',
    required: 500_000_000_000_000n, // 500,000 GHOST (6 decimals)
    multiplier: 3.0,
    benefits: [
      'All Pro benefits',
      'Unlimited API requests',
      'White-label options',
      'Direct line to core team',
      'Protocol fee discounts (20%)'
    ]
  }
} as const

/**
 * Payment Options with GHOST Burning
 */
export const PAYMENT_OPTIONS = {
  /** Standard USDC payment */
  USDC: {
    amount: 1_000_000n, // 1 USDC (6 decimals)
    token: 'USDC',
    discount: 0
  },
  /** Burn GHOST for 25% discount */
  GHOST_BURN: {
    amount: 75_000_000n, // 75 GHOST (6 decimals)
    token: 'GHOST',
    discount: 0.25, // 25% discount (equivalent to 1 USDC)
    note: 'Tokens are permanently burned (deflationary)'
  }
} as const