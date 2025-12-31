/**
 * B2B Prepaid Token Account System
 *
 * Manages USDC token accounts for B2B API billing.
 * Each team has a prepaid USDC account that funds API usage.
 *
 * Pricing Model (from REVENUE_SHARE_STAKING_IMPLEMENTATION.md):
 * - Startup: 50 USDC/month (10K requests), overage 0.01 USDC
 * - Growth: 250 USDC/month (100K requests), overage 0.005 USDC
 * - Scale: 1000 USDC/month (500K requests), overage 0.002 USDC
 * - Enterprise: Custom
 */

import { address, type Address } from '@solana/addresses'
import { findAssociatedTokenPda, fetchToken, TOKEN_PROGRAM_ADDRESS } from '@solana-program/token'
import { getServerWallet, getRpc } from './server-wallet'

// USDC Mint addresses
export const USDC_MINTS = {
  mainnet: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  devnet: address('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
} as const

export const USDC_DECIMALS = 6

// GHOST Token Mints (different addresses for devnet and mainnet)
// Devnet: Test token for development (use /api/airdrop/ghost for test tokens)
// Mainnet: Real GHOST token (pump.fun CA)
export const GHOST_MINTS = {
  devnet: address('BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh'), // Devnet test token
  mainnet: address('DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump'), // Real pump.fun token
} as const

// Legacy export for backwards compatibility (defaults to mainnet)
export const GHOST_MINT = GHOST_MINTS.mainnet

// GHOST token has 6 decimals (verified on-chain for both networks)
export const GHOST_DECIMALS = 6

/**
 * Get GHOST mint address for the current network
 */
export function getGhostMint(network: 'mainnet' | 'devnet' = 'devnet'): Address {
  return GHOST_MINTS[network]
}

// Pricing tiers (from revenue docs)
export const PRICING_TIERS = {
  startup: {
    monthlyFee: 50_000000, // 50 USDC (6 decimals)
    includedRequests: 10_000,
    overageRate: 10_000, // 0.01 USDC per request
  },
  growth: {
    monthlyFee: 250_000000, // 250 USDC
    includedRequests: 100_000,
    overageRate: 5_000, // 0.005 USDC per request
  },
  scale: {
    monthlyFee: 1_000_000000, // 1000 USDC
    includedRequests: 500_000,
    overageRate: 2_000, // 0.002 USDC per request
  },
  enterprise: {
    monthlyFee: 0, // Custom pricing
    includedRequests: -1, // Unlimited
    overageRate: 0,
  },
} as const

export type PricingTier = keyof typeof PRICING_TIERS

/**
 * Calculate cost for API request based on tier
 */
export function calculateRequestCost(tier: PricingTier, requestsThisMonth: number): bigint {
  const pricing = PRICING_TIERS[tier]

  // Enterprise has custom pricing
  if (tier === 'enterprise') {
    return 0n
  }

  // Within included requests? Free
  if (requestsThisMonth < pricing.includedRequests) {
    return 0n
  }

  // Overage charge
  return BigInt(pricing.overageRate)
}

/**
 * Get or create team's USDC token account
 *
 * This creates an associated token account (ATA) for the team's wallet.
 * The ATA is deterministic based on wallet + mint address.
 */
export async function getOrCreateTeamTokenAccount(
  teamWalletAddress: Address,
  network: 'mainnet' | 'devnet' = 'devnet'
): Promise<{ tokenAccount: Address; created: boolean }> {
  const rpc = getRpc()
  const usdcMint = USDC_MINTS[network]

  // Calculate ATA address (deterministic) using modern API
  const [tokenAccount] = await findAssociatedTokenPda({
    mint: usdcMint,
    owner: teamWalletAddress,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })

  try {
    // Check if account exists
    const accountInfo = await rpc.getAccountInfo(tokenAccount, { encoding: 'base64' }).send()

    if (accountInfo.value) {
      return { tokenAccount, created: false }
    }
  } catch (error) {
    console.log('[TokenAccount] Account does not exist, will create:', tokenAccount)
  }

  // Account doesn't exist, create it
  // Note: ATA creation requires a transaction with the getCreateAssociatedTokenInstructionAsync
  // This is left as TODO for full implementation
  console.log('[TokenAccount] ATA needs creation:', tokenAccount)

  return { tokenAccount, created: true }
}

/**
 * Get USDC balance for team's token account
 */
export async function getTeamBalance(
  tokenAccountAddress: Address
): Promise<{ balance: bigint; uiBalance: number }> {
  const rpc = getRpc()

  try {
    const accountInfo = await fetchToken(rpc, tokenAccountAddress)

    const balance = accountInfo.data.amount
    const uiBalance = Number(balance) / Math.pow(10, USDC_DECIMALS)

    return { balance, uiBalance }
  } catch (error) {
    console.error('[TokenAccount] Failed to get balance:', error)
    return { balance: 0n, uiBalance: 0 }
  }
}

/**
 * Check if team has sufficient balance for API request
 */
export async function checkSufficientBalance(
  tokenAccountAddress: Address,
  costMicroUsdc: bigint
): Promise<{ sufficient: boolean; currentBalance: bigint; required: bigint }> {
  const { balance } = await getTeamBalance(tokenAccountAddress)

  return {
    sufficient: balance >= costMicroUsdc,
    currentBalance: balance,
    required: costMicroUsdc,
  }
}

/**
 * Deduct USDC from team account for API usage
 *
 * This transfers USDC from team's account to protocol treasury.
 * Requires team to have pre-authorized the protocol to spend tokens.
 */
export async function deductUsage(
  teamTokenAccount: Address,
  costMicroUsdc: bigint,
  network: 'mainnet' | 'devnet' = 'devnet'
): Promise<{ success: boolean; signature?: string; error?: string }> {
  if (costMicroUsdc === 0n) {
    return { success: true }
  }

  try {
    const serverWallet = await getServerWallet()
    const _rpc = getRpc()
    const usdcMint = USDC_MINTS[network]

    // Get protocol treasury ATA using modern API
    const [protocolTreasuryAta] = await findAssociatedTokenPda({
      mint: usdcMint,
      owner: serverWallet.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    })

    // Check balance
    const { sufficient, currentBalance } = await checkSufficientBalance(
      teamTokenAccount,
      costMicroUsdc
    )

    if (!sufficient) {
      return {
        success: false,
        error: `Insufficient balance: have ${currentBalance}, need ${costMicroUsdc}`,
      }
    }

    // TODO: Build and send transfer transaction using modern @solana/kit
    // For now, return mock success
    console.log('[TokenAccount] Deducted:', costMicroUsdc, 'from', teamTokenAccount)

    return {
      success: true,
      signature: 'mock_signature_' + Date.now(),
    }
  } catch (error) {
    console.error('[TokenAccount] Deduction failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Initiate deposit to team account
 *
 * Returns a transaction for the team to sign that deposits USDC.
 */
export async function createDepositTransaction(
  fromWalletAddress: Address,
  toTokenAccount: Address,
  amountUsdc: number,
  network: 'mainnet' | 'devnet' = 'devnet'
): Promise<{
  transaction: string // Base64 encoded transaction
  amount: bigint
  amountUi: number
}> {
  const usdcMint = USDC_MINTS[network]
  const amountMicroUsdc = BigInt(Math.floor(amountUsdc * Math.pow(10, USDC_DECIMALS)))

  // Get sender's USDC token account using modern API
  const [fromTokenAccount] = await findAssociatedTokenPda({
    mint: usdcMint,
    owner: fromWalletAddress,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })

  // TODO: Build transfer transaction using modern @solana/kit
  // For now, return mock transaction
  console.log('[TokenAccount] Created deposit tx:', amountUsdc, 'USDC')

  return {
    transaction: 'base64_encoded_transaction',
    amount: amountMicroUsdc,
    amountUi: amountUsdc,
  }
}

/**
 * Check if team needs refill notification
 *
 * Triggers notification when balance < $10 USDC
 */
export function shouldNotifyRefill(balanceUsdc: number): boolean {
  const LOW_BALANCE_THRESHOLD = 10 // $10 USDC
  return balanceUsdc < LOW_BALANCE_THRESHOLD
}

/**
 * Calculate projected balance based on current usage
 */
export function calculateProjectedBalance(
  currentBalance: number,
  avgDailyRequests: number,
  tier: PricingTier
): {
  projectedBalance: number
  daysRemaining: number
  needsRefill: boolean
} {
  const pricing = PRICING_TIERS[tier]

  // Enterprise tier has unlimited
  if (tier === 'enterprise') {
    return {
      projectedBalance: currentBalance,
      daysRemaining: Infinity,
      needsRefill: false,
    }
  }

  // Calculate average daily cost
  const monthlyIncluded = pricing.includedRequests
  const dailyIncluded = monthlyIncluded / 30

  let dailyCost = 0
  if (avgDailyRequests > dailyIncluded) {
    const overageRequests = avgDailyRequests - dailyIncluded
    dailyCost = (overageRequests * pricing.overageRate) / Math.pow(10, USDC_DECIMALS)
  }

  // How many days until balance runs out?
  const daysRemaining = dailyCost > 0 ? currentBalance / dailyCost : Infinity
  const projectedBalance = Math.max(0, currentBalance - dailyCost * 30)

  return {
    projectedBalance,
    daysRemaining,
    needsRefill: daysRemaining < 7, // Alert if < 1 week remaining
  }
}

/**
 * Calculate overage fees (100% goes to staker rewards pool)
 */
export function calculateOverageFees(
  requestsThisMonth: number,
  tier: PricingTier
): {
  overageRequests: number
  overageFees: bigint
  overageFeesUi: number
  goesToStakers: boolean
} {
  const pricing = PRICING_TIERS[tier]

  if (tier === 'enterprise' || requestsThisMonth <= pricing.includedRequests) {
    return {
      overageRequests: 0,
      overageFees: 0n,
      overageFeesUi: 0,
      goesToStakers: false,
    }
  }

  const overageRequests = requestsThisMonth - pricing.includedRequests
  const overageFees = BigInt(overageRequests) * BigInt(pricing.overageRate)
  const overageFeesUi = Number(overageFees) / Math.pow(10, USDC_DECIMALS)

  return {
    overageRequests,
    overageFees,
    overageFeesUi,
    goesToStakers: true, // 100% of overage goes to stakers per revenue model
  }
}

// ─── GHOST TOKEN FUNCTIONS ───────────────────────────────────────────────────

/**
 * Get or create user's GHOST token account
 */
export async function getOrCreateGhostTokenAccount(
  userWalletAddress: Address,
  network: 'mainnet' | 'devnet' = 'devnet'
): Promise<{ tokenAccount: Address; created: boolean }> {
  const rpc = getRpc()
  const ghostMint = getGhostMint(network)

  // Calculate ATA address for GHOST token using modern API
  const [tokenAccount] = await findAssociatedTokenPda({
    mint: ghostMint,
    owner: userWalletAddress,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })

  try {
    // Check if account exists
    const accountInfo = await rpc.getAccountInfo(tokenAccount, { encoding: 'base64' }).send()

    if (accountInfo.value) {
      return { tokenAccount, created: false }
    }
  } catch (error) {
    console.log('[GhostToken] Account does not exist, will create:', tokenAccount)
  }

  // Account doesn't exist, create it
  // Note: ATA creation requires a transaction with the getCreateAssociatedTokenInstructionAsync
  // This is left as TODO for full implementation
  console.log('[GhostToken] ATA needs creation:', tokenAccount)

  return { tokenAccount, created: true }
}

/**
 * Get GHOST token balance for user's token account
 */
export async function getGhostBalance(
  tokenAccountAddress: Address
): Promise<{ balance: bigint; uiBalance: number; decimals: number }> {
  const rpc = getRpc()

  try {
    const accountInfo = await fetchToken(rpc, tokenAccountAddress)

    const balance = accountInfo.data.amount
    // Use GHOST_DECIMALS for conversion
    const uiBalance = Number(balance) / Math.pow(10, GHOST_DECIMALS)

    return { balance, uiBalance, decimals: GHOST_DECIMALS }
  } catch (error) {
    console.error('[GhostToken] Failed to get balance:', error)
    return { balance: 0n, uiBalance: 0, decimals: GHOST_DECIMALS }
  }
}

/**
 * Check if user has sufficient GHOST balance for API request
 */
export async function checkSufficientGhostBalance(
  tokenAccountAddress: Address,
  costMicroGhost: bigint
): Promise<{ sufficient: boolean; currentBalance: bigint; required: bigint }> {
  const { balance } = await getGhostBalance(tokenAccountAddress)

  return {
    sufficient: balance >= costMicroGhost,
    currentBalance: balance,
    required: costMicroGhost,
  }
}

/**
 * Deduct GHOST from user account for API usage
 *
 * This transfers GHOST from user's account to protocol treasury.
 */
export async function deductGhostUsage(
  userTokenAccount: Address,
  costMicroGhost: bigint,
  network: 'mainnet' | 'devnet' = 'devnet'
): Promise<{ success: boolean; signature?: string; error?: string }> {
  if (costMicroGhost === 0n) {
    return { success: true }
  }

  try {
    const serverWallet = await getServerWallet()
    const _rpc = getRpc()
    const ghostMint = getGhostMint(network)

    // Get protocol treasury GHOST ATA using modern API
    const [protocolTreasuryAta] = await findAssociatedTokenPda({
      mint: ghostMint,
      owner: serverWallet.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    })

    // Check balance
    const { sufficient, currentBalance } = await checkSufficientGhostBalance(
      userTokenAccount,
      costMicroGhost
    )

    if (!sufficient) {
      return {
        success: false,
        error: `Insufficient GHOST balance: have ${currentBalance}, need ${costMicroGhost}`,
      }
    }

    // TODO: Build and send transfer transaction using modern @solana/kit
    // For now, return mock success
    console.log('[GhostToken] Deducted:', costMicroGhost, 'from', userTokenAccount)

    return {
      success: true,
      signature: 'mock_ghost_signature_' + Date.now(),
    }
  } catch (error) {
    console.error('[GhostToken] Deduction failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Calculate GHOST token cost for API request
 *
 * Uses live GHOST/USDC price from Jupiter DEX aggregator.
 * Falls back to 0.01 USDC if Jupiter is unavailable.
 *
 * NOTE: On devnet, Jupiter pricing won't work (no liquidity), so we use fallback.
 */
export async function calculateGhostCost(
  usdcCostMicro: bigint,
  network: 'mainnet' | 'devnet' = 'devnet',
  ghostPriceUsdc?: number // Optional override for testing
): Promise<bigint> {
  // Convert USDC micro units to USDC
  const usdcCost = Number(usdcCostMicro) / Math.pow(10, USDC_DECIMALS)

  // Get price from Jupiter or use override
  let price = ghostPriceUsdc
  if (!price) {
    // Dynamically import to avoid circular dependency
    const { getGhostPriceInUsdc } = await import('./jupiter-price-oracle')
    price = await getGhostPriceInUsdc(network)
  }

  // Calculate GHOST amount needed
  const ghostAmount = usdcCost / price

  // Convert to micro units
  const ghostMicro = BigInt(Math.floor(ghostAmount * Math.pow(10, GHOST_DECIMALS)))

  return ghostMicro
}

/**
 * Calculate GHOST token cost synchronously (uses default price)
 *
 * Use this when you need immediate calculation without async.
 * For accurate pricing, prefer the async calculateGhostCost.
 */
export function calculateGhostCostSync(
  usdcCostMicro: bigint,
  ghostPriceUsdc: number = 0.01 // Default: 1 GHOST = $0.01 USDC
): bigint {
  // Convert USDC micro units to USDC
  const usdcCost = Number(usdcCostMicro) / Math.pow(10, USDC_DECIMALS)

  // Calculate GHOST amount needed
  const ghostAmount = usdcCost / ghostPriceUsdc

  // Convert to micro units
  const ghostMicro = BigInt(Math.floor(ghostAmount * Math.pow(10, GHOST_DECIMALS)))

  return ghostMicro
}
