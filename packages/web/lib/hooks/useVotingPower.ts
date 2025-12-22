'use client'

import { useQuery } from '@tanstack/react-query'
import { useCrossmintSigner } from '@/lib/hooks/useCrossmintSigner'
import { getGhostSpeakClient } from '@/lib/ghostspeak/client'
import type { Address } from '@solana/kit'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

/**
 * Voting power breakdown by source
 * Based on the x402 marketplace governance design
 */
export interface VotingPowerBreakdown {
  // Token-based voting (40% weight)
  tokenBalance: bigint
  tokenVotingPower: bigint
  tokenWeight: number // 0.40

  // Reputation-based voting (25% weight)
  reputationScore: number // 0-10000 basis points
  reputationVotingPower: bigint
  reputationWeight: number // 0.25
  isVerifiedAgent: boolean

  // x402 Volume-based voting (20% weight)
  x402Volume30d: bigint
  volumeVotingPower: bigint
  volumeWeight: number // 0.20

  // Lockup/Staking multiplier (15% weight)
  stakedTokens: bigint
  lockupDuration: number // days
  lockupMultiplier: number // 1.0 - 3.0
  stakingVotingPower: bigint
  stakingWeight: number // 0.15

  // Delegations
  delegatedToYou: bigint
  delegatedByYou: bigint

  // Final totals
  totalVotingPower: bigint
  effectiveVotingPower: bigint // After delegations

  // Metadata
  lastUpdated: Date
  isLoading: boolean
  hasError: boolean
}

export interface AgentReputationData {
  agentAddress: Address
  reputationScore: number
  x402TotalCalls: number
  x402TotalPayments: bigint
  isVerified: boolean
  isActive: boolean
  lastPaymentTimestamp: Date
}

export interface LockupTier {
  days: number
  multiplier: number
  label: string
}

// =====================================================
// CONSTANTS
// =====================================================

export const VOTING_WEIGHTS = {
  TOKEN: 0.40,
  REPUTATION: 0.25,
  VOLUME: 0.20,
  STAKING: 0.15,
} as const

export const LOCKUP_TIERS: LockupTier[] = [
  { days: 0, multiplier: 1.0, label: 'No lockup' },
  { days: 30, multiplier: 1.1, label: '1 month' },
  { days: 90, multiplier: 1.25, label: '3 months' },
  { days: 180, multiplier: 1.5, label: '6 months' },
  { days: 365, multiplier: 2.0, label: '1 year' },
  { days: 730, multiplier: 3.0, label: '2 years' },
]

// =====================================================
// CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate voting power from token balance
 * Uses square root to reduce whale dominance
 */
export function calculateTokenVotingPower(balance: bigint): bigint {
  if (balance <= 0n) return 0n
  // Square root voting: sqrt(balance) * 1000 for precision
  // 1M tokens = 1000 voting power
  // 100K tokens = ~316 voting power
  const sqrt = bigIntSqrt(balance)
  return sqrt
}

/**
 * Calculate voting power from reputation score
 * Only verified agents (x402_total_calls > 0) get this bonus
 */
export function calculateReputationVotingPower(
  reputationScore: number,
  isVerified: boolean
): bigint {
  if (!isVerified) return 0n
  // reputation_score is 0-10000 basis points
  // 10000 bp = 100% = 1000 voting power
  return BigInt(Math.floor(reputationScore / 10))
}

/**
 * Calculate voting power from x402 transaction volume
 * Rewards active marketplace participants
 */
export function calculateVolumeVotingPower(volume30d: bigint): bigint {
  if (volume30d <= 0n) return 0n
  // $10,000 volume = 100 voting power
  // Capped at 1000 voting power ($100,000 volume)
  // Assuming volume is in smallest token units (6 decimals for USDC)
  const volumeUSD = volume30d / 1_000_000n // Convert to USD
  const power = volumeUSD / 100n
  return power > 1000n ? 1000n : power
}

/**
 * Get lockup multiplier based on duration
 */
export function getLockupMultiplier(lockupDays: number): number {
  for (let i = LOCKUP_TIERS.length - 1; i >= 0; i--) {
    if (lockupDays >= LOCKUP_TIERS[i].days) {
      return LOCKUP_TIERS[i].multiplier
    }
  }
  return 1.0
}

/**
 * Calculate staking voting power with lockup multiplier
 */
export function calculateStakingVotingPower(
  stakedTokens: bigint,
  lockupDays: number
): bigint {
  if (stakedTokens <= 0n) return 0n
  const multiplier = getLockupMultiplier(lockupDays)
  const basePower = calculateTokenVotingPower(stakedTokens)
  // Apply multiplier (multiplier is 1.0-3.0, so multiply by 100 for precision)
  return (basePower * BigInt(Math.floor(multiplier * 100))) / 100n
}

/**
 * Calculate total voting power from all sources
 */
export function calculateTotalVotingPower(breakdown: {
  tokenBalance: bigint
  reputationScore: number
  isVerified: boolean
  x402Volume30d: bigint
  stakedTokens: bigint
  lockupDays: number
  delegatedToYou: bigint
  delegatedByYou: bigint
}): VotingPowerBreakdown {
  const tokenVotingPower = calculateTokenVotingPower(breakdown.tokenBalance)
  const reputationVotingPower = calculateReputationVotingPower(
    breakdown.reputationScore,
    breakdown.isVerified
  )
  const volumeVotingPower = calculateVolumeVotingPower(breakdown.x402Volume30d)
  const stakingVotingPower = calculateStakingVotingPower(
    breakdown.stakedTokens,
    breakdown.lockupDays
  )

  // Calculate weighted total
  const weightedToken = (tokenVotingPower * BigInt(Math.floor(VOTING_WEIGHTS.TOKEN * 100))) / 100n
  const weightedReputation = (reputationVotingPower * BigInt(Math.floor(VOTING_WEIGHTS.REPUTATION * 100))) / 100n
  const weightedVolume = (volumeVotingPower * BigInt(Math.floor(VOTING_WEIGHTS.VOLUME * 100))) / 100n
  const weightedStaking = (stakingVotingPower * BigInt(Math.floor(VOTING_WEIGHTS.STAKING * 100))) / 100n

  const totalVotingPower = weightedToken + weightedReputation + weightedVolume + weightedStaking

  // Effective power includes delegations
  const effectiveVotingPower = totalVotingPower + breakdown.delegatedToYou - breakdown.delegatedByYou

  return {
    tokenBalance: breakdown.tokenBalance,
    tokenVotingPower,
    tokenWeight: VOTING_WEIGHTS.TOKEN,

    reputationScore: breakdown.reputationScore,
    reputationVotingPower,
    reputationWeight: VOTING_WEIGHTS.REPUTATION,
    isVerifiedAgent: breakdown.isVerified,

    x402Volume30d: breakdown.x402Volume30d,
    volumeVotingPower,
    volumeWeight: VOTING_WEIGHTS.VOLUME,

    stakedTokens: breakdown.stakedTokens,
    lockupDuration: breakdown.lockupDays,
    lockupMultiplier: getLockupMultiplier(breakdown.lockupDays),
    stakingVotingPower,
    stakingWeight: VOTING_WEIGHTS.STAKING,

    delegatedToYou: breakdown.delegatedToYou,
    delegatedByYou: breakdown.delegatedByYou,

    totalVotingPower,
    effectiveVotingPower,

    lastUpdated: new Date(),
    isLoading: false,
    hasError: false,
  }
}

/**
 * BigInt square root helper
 */
function bigIntSqrt(value: bigint): bigint {
  if (value < 0n) throw new Error('Square root of negative number')
  if (value < 2n) return value

  let x = value
  let y = (x + 1n) / 2n
  while (y < x) {
    x = y
    y = (x + value / x) / 2n
  }
  return x
}

// =====================================================
// REACT HOOKS
// =====================================================

/**
 * Hook to get user's complete voting power breakdown
 */
export function useVotingPowerBreakdown(options?: { enabled?: boolean }) {
  const { address, isConnected } = useCrossmintSigner()

  return useQuery({
    queryKey: ['voting-power-breakdown', address],
    queryFn: async (): Promise<VotingPowerBreakdown> => {
      if (!isConnected || !address) {
        return createEmptyBreakdown()
      }

      try {
        // In production, this would fetch from:
        // 1. Token balance from RPC
        // 2. Agent account for reputation
        // 3. Staking account for locked tokens
        // 4. Delegation accounts

        // For now, use demo data that demonstrates the system
        const demoData = {
          tokenBalance: 50000n * 1_000_000n, // 50,000 tokens
          reputationScore: 7500, // 75% reputation
          isVerified: true,
          x402Volume30d: 25000n * 1_000_000n, // $25,000 volume
          stakedTokens: 20000n * 1_000_000n, // 20,000 staked
          lockupDays: 180, // 6 month lockup
          delegatedToYou: 5000n,
          delegatedByYou: 0n,
        }

        return calculateTotalVotingPower(demoData)
      } catch (error) {
        console.error('Failed to fetch voting power:', error)
        return createEmptyBreakdown(true)
      }
    },
    enabled: (options?.enabled ?? true) && isConnected,
    refetchInterval: 60000, // Refetch every minute
  })
}

/**
 * Hook to get agent's reputation data for voting power
 */
export function useAgentReputationForVoting(
  agentAddress: Address | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['agent-reputation-voting', agentAddress],
    queryFn: async (): Promise<AgentReputationData | null> => {
      if (!agentAddress) return null

      try {
        const client = getGhostSpeakClient()

        // Fetch agent data
        // In production, this would call client.agents.getAgent(agentAddress)
        // For now, return demo data
        return {
          agentAddress,
          reputationScore: 8500,
          x402TotalCalls: 1250,
          x402TotalPayments: 75000n * 1_000_000n,
          isVerified: true,
          isActive: true,
          lastPaymentTimestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        }
      } catch (error) {
        console.error('Failed to fetch agent reputation:', error)
        return null
      }
    },
    enabled: (options?.enabled ?? true) && !!agentAddress,
  })
}

/**
 * Hook to check if user can vote (meets minimum requirements)
 */
export function useCanVote(options?: { enabled?: boolean }) {
  const { data: votingPower, isLoading } = useVotingPowerBreakdown(options)

  return {
    canVote: votingPower ? votingPower.effectiveVotingPower > 0n : false,
    votingPower,
    isLoading,
    requirements: {
      hasTokens: votingPower ? votingPower.tokenBalance > 0n : false,
      hasReputation: votingPower?.isVerifiedAgent ?? false,
      hasVolume: votingPower ? votingPower.x402Volume30d > 0n : false,
      meetsMinimum: votingPower ? votingPower.effectiveVotingPower >= 100n : false,
    },
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function createEmptyBreakdown(hasError = false): VotingPowerBreakdown {
  return {
    tokenBalance: 0n,
    tokenVotingPower: 0n,
    tokenWeight: VOTING_WEIGHTS.TOKEN,

    reputationScore: 0,
    reputationVotingPower: 0n,
    reputationWeight: VOTING_WEIGHTS.REPUTATION,
    isVerifiedAgent: false,

    x402Volume30d: 0n,
    volumeVotingPower: 0n,
    volumeWeight: VOTING_WEIGHTS.VOLUME,

    stakedTokens: 0n,
    lockupDuration: 0,
    lockupMultiplier: 1.0,
    stakingVotingPower: 0n,
    stakingWeight: VOTING_WEIGHTS.STAKING,

    delegatedToYou: 0n,
    delegatedByYou: 0n,

    totalVotingPower: 0n,
    effectiveVotingPower: 0n,

    lastUpdated: new Date(),
    isLoading: false,
    hasError,
  }
}

/**
 * Format voting power for display
 */
export function formatVotingPower(power: bigint): string {
  const num = Number(power)
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`
  }
  return num.toLocaleString()
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: bigint, decimals = 6): string {
  const divisor = BigInt(10 ** decimals)
  const whole = amount / divisor
  const fraction = amount % divisor
  const num = Number(whole) + Number(fraction) / Number(divisor)
  
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`
  }
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 })
}
