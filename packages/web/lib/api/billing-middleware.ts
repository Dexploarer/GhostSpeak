/**
 * Billing Middleware
 *
 * Unified middleware for API billing that supports:
 * - Individual users with USDC or GHOST token accounts
 * - Teams with USDC token accounts
 * - Balance enforcement (402 Payment Required)
 * - Automatic token deduction after successful requests
 * - Revenue distribution (10% staker pool, 90% protocol)
 */

import { address, type Address } from '@solana/addresses'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import {
  getTeamBalance,
  getGhostBalance,
  calculateGhostCost,
  deductUsage,
  deductGhostUsage,
} from '@/lib/b2b-token-accounts'

// Network type - 'mainnet' or 'devnet'
type Network = 'mainnet' | 'devnet'

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export interface AuthenticatedUser {
  userId: string // Can be cast to Id<'users'> when needed
  apiKeyId: string // Can be cast to Id<'apiKeys'> when needed
  tier: string
}

export interface BillingConfig {
  /** Cost in USD cents (e.g., 1 = 1 cent = $0.01) */
  costCents: number
  /** API endpoint name for tracking */
  endpoint: string
  /** Network to use for on-chain transactions (defaults to env variable) */
  network?: Network
}

/**
 * Get the current Solana network from environment
 * Defaults to 'devnet' since GhostSpeak programs are currently on devnet
 */
function getCurrentNetwork(): Network {
  const envNetwork = process.env.NEXT_PUBLIC_SOLANA_NETWORK
  return (envNetwork === 'mainnet' || envNetwork === 'devnet') ? envNetwork : 'devnet'
}

export interface BillingResult {
  success: boolean
  paymentToken?: 'usdc' | 'ghost'
  amountCharged?: {
    usdc: number // UI amount in USDC
    ghost?: number // UI amount in GHOST
  }
  error?: string
  status?: number
}

/**
 * Middleware wrapper for API endpoints that require payment
 *
 * Usage:
 * ```typescript
 * const result = await withBillingEnforcement(
 *   authUser,
 *   { costCents: 1, endpoint: '/verify' },
 *   async () => {
 *     // Your API logic here
 *     return { verified: true, ... }
 *   }
 * )
 *
 * if (!result.success) {
 *   return NextResponse.json({ error: result.error }, { status: result.status })
 * }
 *
 * return NextResponse.json(result.data)
 * ```
 */
export async function withBillingEnforcement<T>(
  authUser: AuthenticatedUser,
  config: BillingConfig,
  handler: () => Promise<T>
): Promise<
  | { success: true; data: T; billing: BillingResult }
  | { success: false; error: string; status: number }
> {
  const network = config.network || getCurrentNetwork()
  const costMicroUsdc = BigInt(config.costCents * 10_000) // Convert cents to micro-USDC

  try {
    // 1. Get user details
    const user = await convexClient.query(api.users.getById, {
      userId: authUser.userId as Id<'users'>,
    })

    if (!user) {
      return {
        success: false,
        error: 'User not found',
        status: 404,
      }
    }

    // 2. Determine billing path: individual user vs team
    let billingPath: 'individual-usdc' | 'individual-ghost' | 'team-usdc'
    let paymentTokenAccount: Address | null = null
    let currentBalance = 0n
    let requiredAmount = costMicroUsdc

    // Check if user has individual payment accounts
    if (user.usdcTokenAccount || user.ghostTokenAccount) {
      // Individual user billing
      const preferredToken = user.preferredPaymentToken || 'usdc'

      if (preferredToken === 'ghost' && user.ghostTokenAccount) {
        // Pay with GHOST
        billingPath = 'individual-ghost'
        paymentTokenAccount = address(user.ghostTokenAccount)

        // Convert USDC cost to GHOST (uses network-specific pricing)
        requiredAmount = await calculateGhostCost(costMicroUsdc, network)

        // Get GHOST balance
        const { balance } = await getGhostBalance(paymentTokenAccount)
        currentBalance = balance
      } else if (user.usdcTokenAccount) {
        // Pay with USDC
        billingPath = 'individual-usdc'
        paymentTokenAccount = address(user.usdcTokenAccount)

        // Get USDC balance
        const { balance } = await getTeamBalance(paymentTokenAccount)
        currentBalance = balance
      } else {
        // No valid payment account
        return {
          success: false,
          error: 'No payment account configured. Please add USDC or GHOST tokens to your account.',
          status: 402,
        }
      }
    } else {
      // Team billing (fall back to team USDC account)
      const teamMembers = await convexClient.query(api.teamMembers.getByUser, {
        userId: authUser.userId as Id<'users'>,
      })

      if (!teamMembers || teamMembers.length === 0) {
        return {
          success: false,
          error: 'No billing account configured. Please set up a payment account or join a team.',
          status: 402,
        }
      }

      const teamId = teamMembers[0].teamId
      const team = await convexClient.query(api.teams.getById, { teamId })

      if (!team || !team.usdcTokenAccount) {
        return {
          success: false,
          error: 'Team does not have a payment account configured.',
          status: 402,
        }
      }

      billingPath = 'team-usdc'
      paymentTokenAccount = address(team.usdcTokenAccount)

      // Get team USDC balance
      const { balance } = await getTeamBalance(paymentTokenAccount)
      currentBalance = balance
    }

    // 3. Check if balance is sufficient
    if (currentBalance < requiredAmount) {
      const token = billingPath.includes('ghost') ? 'GHOST' : 'USDC'
      const decimals = billingPath.includes('ghost') ? 6 : 6
      const currentUi = Number(currentBalance) / Math.pow(10, decimals)
      const requiredUi = Number(requiredAmount) / Math.pow(10, decimals)

      return {
        success: false,
        error: `Insufficient ${token} balance. Current: ${currentUi.toFixed(2)} ${token}, Required: ${requiredUi.toFixed(2)} ${token}. Please add funds to continue.`,
        status: 402, // Payment Required
      }
    }

    // 4. Execute the API handler (balance is sufficient)
    const result = await handler()

    // 5. Deduct tokens after successful request
    let deductionSuccess = false
    let transactionSignature: string | undefined

    if (billingPath === 'individual-ghost' && paymentTokenAccount) {
      // Deduct GHOST tokens
      const deductResult = await deductGhostUsage(paymentTokenAccount, requiredAmount, network)
      deductionSuccess = deductResult.success
      transactionSignature = deductResult.signature

      if (deductionSuccess) {
        // Record deduction in database
        // @ts-expect-error - Convex API types need regeneration (run bunx convex dev)
        await convexClient.mutation(api.userBilling.recordDeduction, {
          userId: authUser.userId as Id<'users'>,
          paymentToken: 'ghost',
          amountMicroUsdc: Number(costMicroUsdc),
          amountMicroGhost: Number(requiredAmount),
          requestCount: 1,
          endpoint: config.endpoint,
          transactionSignature,
        })
      }
    } else if (
      (billingPath === 'individual-usdc' || billingPath === 'team-usdc') &&
      paymentTokenAccount
    ) {
      // Deduct USDC tokens
      const deductResult = await deductUsage(paymentTokenAccount, requiredAmount, network)
      deductionSuccess = deductResult.success
      transactionSignature = deductResult.signature

      if (deductionSuccess) {
        // Record deduction in database
        // @ts-expect-error - Convex API types need regeneration (run bunx convex dev)
        await convexClient.mutation(api.userBilling.recordDeduction, {
          userId: authUser.userId as Id<'users'>,
          paymentToken: 'usdc',
          amountMicroUsdc: Number(costMicroUsdc),
          requestCount: 1,
          endpoint: config.endpoint,
          transactionSignature,
        })
      }
    }

    // 6. Distribute revenue (10% staker pool, 90% protocol)
    // This will be called automatically by the revenue distribution module
    if (deductionSuccess) {
      // @ts-expect-error - Convex API types need regeneration (run bunx convex dev)
      await convexClient.mutation(api.revenue.recordRevenue, {
        paymentToken: billingPath.includes('ghost') ? 'ghost' : 'usdc',
        amountMicroUsdc: Number(costMicroUsdc),
        amountMicroGhost: billingPath.includes('ghost') ? Number(requiredAmount) : 0,
        endpoint: config.endpoint,
      }).catch((error) => {
        console.error('[Billing] Revenue distribution failed:', error)
        // Don't fail the request if revenue tracking fails
      })
    }

    // 7. Return success with billing info
    const billingResult: BillingResult = {
      success: deductionSuccess,
      paymentToken: billingPath.includes('ghost') ? 'ghost' : 'usdc',
      amountCharged: {
        usdc: Number(costMicroUsdc) / 1_000_000,
        ghost: billingPath.includes('ghost') ? Number(requiredAmount) / 1_000_000 : undefined,
      },
    }

    if (!deductionSuccess) {
      console.warn('[Billing] Token deduction failed but request succeeded')
    }

    return {
      success: true,
      data: result,
      billing: billingResult,
    }
  } catch (error) {
    console.error('[Billing Middleware] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Billing system error',
      status: 500,
    }
  }
}

/**
 * Helper: Get user's current balance (USDC or GHOST)
 */
export async function getUserBalance(
  userId: string
): Promise<{
  usdc?: { balance: bigint; uiBalance: number; tokenAccount: string }
  ghost?: { balance: bigint; uiBalance: number; tokenAccount: string }
  preferredPaymentToken?: 'usdc' | 'ghost'
} | null> {
  const user = await convexClient.query(api.users.getById, { userId: userId as Id<'users'> })

  if (!user) {
    return null
  }

  const result: any = {
    preferredPaymentToken: user.preferredPaymentToken || 'usdc',
  }

  // Check USDC balance
  if (user.usdcTokenAccount) {
    const tokenAccount = address(user.usdcTokenAccount)
    const { balance, uiBalance } = await getTeamBalance(tokenAccount)
    result.usdc = {
      balance,
      uiBalance,
      tokenAccount: user.usdcTokenAccount,
    }
  }

  // Check GHOST balance
  if (user.ghostTokenAccount) {
    const tokenAccount = address(user.ghostTokenAccount)
    const { balance, uiBalance } = await getGhostBalance(tokenAccount)
    result.ghost = {
      balance,
      uiBalance,
      tokenAccount: user.ghostTokenAccount,
    }
  }

  return result
}
