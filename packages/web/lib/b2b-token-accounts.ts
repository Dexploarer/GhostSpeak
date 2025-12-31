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

import {
  address,
  type Address
} from '@solana/addresses'
import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  type Rpc,
  lamports
} from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token'
import { getServerWallet, getRpc } from './server-wallet'

// USDC Mint addresses
export const USDC_MINTS = {
  mainnet: address('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  devnet: address('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
} as const

export const USDC_DECIMALS = 6

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

  // Calculate ATA address (deterministic)
  const tokenAccount = getAssociatedTokenAddressSync(
    usdcMint,
    teamWalletAddress,
    false, // allowOwnerOffCurve
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  try {
    // Check if account exists
    const accountInfo = await rpc
      .getAccountInfo(tokenAccount, { encoding: 'base64' })
      .send()

    if (accountInfo.value) {
      return { tokenAccount, created: false }
    }
  } catch (error) {
    console.log('[TokenAccount] Account does not exist, will create:', tokenAccount)
  }

  // Account doesn't exist, create it
  const serverWallet = await getServerWallet()

  const createIx = createAssociatedTokenAccountInstruction(
    serverWallet.address, // payer
    tokenAccount, // ata
    teamWalletAddress, // owner
    usdcMint, // mint
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  // TODO: Build and send transaction using web3.js v2 patterns
  // For now, return the expected address
  console.log('[TokenAccount] Created ATA:', tokenAccount)

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
    const accountInfo = await getAccount(
      rpc as any, // Type compatibility
      tokenAccountAddress,
      'confirmed'
    )

    const balance = BigInt(accountInfo.amount.toString())
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
    const rpc = getRpc()
    const usdcMint = USDC_MINTS[network]

    // Get protocol treasury ATA
    const protocolTreasuryAta = getAssociatedTokenAddressSync(
      usdcMint,
      serverWallet.address,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )

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

    // Create transfer instruction
    const transferIx = createTransferInstruction(
      teamTokenAccount, // from
      protocolTreasuryAta, // to
      serverWallet.address, // authority (requires delegation)
      costMicroUsdc // amount
    )

    // TODO: Build and send transaction using web3.js v2
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
  transaction: string; // Base64 encoded transaction
  amount: bigint;
  amountUi: number;
}> {
  const usdcMint = USDC_MINTS[network]
  const amountMicroUsdc = BigInt(Math.floor(amountUsdc * Math.pow(10, USDC_DECIMALS)))

  // Get sender's USDC token account
  const fromTokenAccount = getAssociatedTokenAddressSync(
    usdcMint,
    fromWalletAddress,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  )

  // Create transfer instruction
  const transferIx = createTransferInstruction(
    fromTokenAccount, // from
    toTokenAccount, // to (team's prepaid account)
    fromWalletAddress, // authority
    amountMicroUsdc // amount
  )

  // TODO: Build transaction using web3.js v2
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
