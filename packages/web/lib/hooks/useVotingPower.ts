'use client'

import { useQuery } from '@tanstack/react-query'
import { useCrossmintSigner } from '@/lib/hooks/useCrossmintSigner'
// import { getGhostSpeakClient } from '@/lib/ghostspeak/client'
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
  TOKEN: 0.4,
  REPUTATION: 0.25,
  VOLUME: 0.2,
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
export function calculateStakingVotingPower(stakedTokens: bigint, lockupDays: number): bigint {
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
  const weightedReputation =
    (reputationVotingPower * BigInt(Math.floor(VOTING_WEIGHTS.REPUTATION * 100))) / 100n
  const weightedVolume =
    (volumeVotingPower * BigInt(Math.floor(VOTING_WEIGHTS.VOLUME * 100))) / 100n
  const weightedStaking =
    (stakingVotingPower * BigInt(Math.floor(VOTING_WEIGHTS.STAKING * 100))) / 100n

  const totalVotingPower = weightedToken + weightedReputation + weightedVolume + weightedStaking

  // Effective power includes delegations
  const effectiveVotingPower =
    totalVotingPower + breakdown.delegatedToYou - breakdown.delegatedByYou

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
        const { getGhostSpeakClient } = await import('@/lib/ghostspeak/client')
        const { getSDKManager } = await import('@/lib/ghostspeak')
        
        const client = getGhostSpeakClient()
        const sdk = getSDKManager()
        
        // 1. Get token balance from on-chain
        // $GHOST Token (pump.fun): DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump
        const GHOST_TOKEN_MINT = process.env.NEXT_PUBLIC_GHOST_TOKEN_MINT || 'DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump'
        const tokenBalance = await sdk.tokens.getTokenBalance(
          address,
          GHOST_TOKEN_MINT
        )
        
        // 2. Get staking data from on-chain
        let stakedTokens = 0n
        let lockupDays = 0
        try {
          const stakingAccount = await client.staking.getStakingAccount(address as Address)
          if (stakingAccount) {
            stakedTokens = stakingAccount.stakedAmount ?? 0n
            // Calculate lockup from lockup end time
            if (stakingAccount.lockupEndsAt) {
              const now = BigInt(Math.floor(Date.now() / 1000))
              const remaining = stakingAccount.lockupEndsAt - now
              lockupDays = remaining > 0n ? Math.floor(Number(remaining) / (24 * 60 * 60)) : 0
            }
          }
        } catch {
          // No stakes found, use defaults
        }
        
        // 3. Get agent reputation (if user is an agent)
        let reputationScore = 0
        let isVerified = false
        try {
          const agents = await client.agents.getAllAgents()
          const userAgent = agents.find(a => a.data?.owner?.toString() === address)
          if (userAgent?.data) {
            reputationScore = Number(userAgent.data.reputationScore || 0)
            isVerified = userAgent.data.isActive && (userAgent.data.totalJobsCompleted || 0) > 0
          }
        } catch {
          // No agent found, use defaults
        }
        
        // 4. Get x402 volume from escrow history
        let x402Volume30d = 0n
        try {
          const metrics = await sdk.analytics.getUserMetrics(address)
          x402Volume30d = metrics.totalVolume
        } catch {
          // No volume data, use default
        }
        
        // 5. Get delegation data (placeholder - SDK doesn't have delegation yet)
        const delegatedToYou = 0n
        const delegatedByYou = 0n

        return calculateTotalVotingPower({
          tokenBalance,
          reputationScore,
          isVerified,
          x402Volume30d,
          stakedTokens,
          lockupDays,
          delegatedToYou,
          delegatedByYou,
        })
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
        const { getGhostSpeakClient } = await import('@/lib/ghostspeak/client')
        const { getSDKManager } = await import('@/lib/ghostspeak')
        
        const client = getGhostSpeakClient()
        const sdk = getSDKManager()
        
        // Fetch agent data from on-chain
        const agentData = await client.agents.getAgentAccount(agentAddress)
        if (!agentData) return null
        
        // Get x402 earnings data
        let x402TotalCalls = 0
        let x402TotalPayments = 0n
        let lastPaymentTimestamp = new Date(0)
        try {
          const earnings = await sdk.analytics.getAgentEarnings(agentAddress.toString())
          x402TotalCalls = earnings.totalCalls
          x402TotalPayments = earnings.totalEarnings
        } catch {
          // No earnings data
        }
        
        // Get escrows to find last payment time
        try {
          const escrows = await client.escrow.getEscrowsBySeller(agentAddress)
          if (escrows.length > 0) {
            const latestEscrow = escrows.reduce((latest, e) => 
              (e.data?.createdAt || 0n) > (latest.data?.createdAt || 0n) ? e : latest
            )
            if (latestEscrow.data?.createdAt) {
              lastPaymentTimestamp = new Date(Number(latestEscrow.data.createdAt) * 1000)
            }
          }
        } catch {
          // No escrow data
        }
        
        return {
          agentAddress,
          reputationScore: Number(agentData.reputationScore || 0),
          x402TotalCalls,
          x402TotalPayments,
          isVerified: agentData.isActive && (agentData.totalJobsCompleted || 0) > 0,
          isActive: agentData.isActive,
          lastPaymentTimestamp,
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
