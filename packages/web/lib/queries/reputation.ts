// Real reputation calculation using blockchain data and advanced algorithms
import { useQuery } from '@tanstack/react-query'
import { getGhostSpeakClient } from '../ghostspeak/client'
import type { Address } from '@solana/addresses'

// Type definitions
interface AgentAccountData {
  totalJobsCompleted?: number
  reputationScore?: number
  owner?: Address
  createdAt?: bigint
  totalEarnings?: bigint
  totalStaked?: bigint
  disputeCount?: number
  lastActivity?: bigint
}

interface JobHistoryItem {
  completed: boolean
  category?: string
  earnings?: bigint
  completedAt?: Date
  rating?: number
}

interface EscrowHistoryItem {
  disputeCount: number
  completed: boolean
  amount?: bigint
  completedAt?: Date
}

interface MarketplaceActivity {
  serviceListings: unknown[]
  purchasedServices: unknown[]
}

interface WorkOrderData {
  agent?: Address
  status?: string
  paymentAmount?: bigint
  completedAt?: bigint
  category?: string
  client?: Address
}

interface EscrowData {
  agent?: Address
  status?: string
  amount?: bigint
  completedAt?: bigint
  disputeCount?: number
}

export interface ReputationMetrics {
  score: number
  totalJobs: number
  successRate: number
  tier: 'NEWCOMER' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND'
  badges: Array<{
    type: string
    name: string
    description: string
    earnedAt: Date
  }>
  categoryScores: Record<string, number>
  riskScore: number
  trustLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'FLAGGED'
  performanceHistory: Array<{
    period: string
    score: number
    jobsCompleted: number
    avgQuality: number
  }>
}

/**
 * Hook to get comprehensive reputation data for an agent
 */
export function useAgentReputation(agentAddress: string) {
  return useQuery({
    queryKey: ['reputation', 'agent', agentAddress],
    queryFn: async (): Promise<ReputationMetrics> => {
      try {
        const client = getGhostSpeakClient()

        // Get agent account data
        const agentModule = client.agents()
        const agentAccount = await agentModule.module.getAgentByAddress(agentAddress as Address)

        if (!agentAccount) {
          throw new Error(`Agent not found: ${agentAddress}`)
        }

        // Calculate comprehensive reputation using real blockchain data
        const reputationMetrics = await calculateComprehensiveReputation(agentAddress, agentAccount)

        return reputationMetrics
      } catch (error) {
        console.error('Failed to fetch agent reputation:', error)
        throw error
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!agentAddress,
  })
}

/**
 * Calculate comprehensive reputation metrics from blockchain data
 */
async function calculateComprehensiveReputation(
  agentAddress: string,
  agentAccount: AgentAccountData
): Promise<ReputationMetrics> {
  // Get job history for the agent
  const jobHistory = await getAgentJobHistory(agentAddress)

  // Get escrow completion data
  const escrowHistory = await getAgentEscrowHistory(agentAddress)

  // Calculate base metrics from blockchain data
  const totalJobs = agentAccount.totalJobsCompleted || 0
  const baseScore = agentAccount.reputationScore || 0
  const successRate = totalJobs > 0 ? Math.min(100, (baseScore / totalJobs) * 20) : 0

  // Calculate category-specific scores
  const categoryScores = calculateCategoryScores(jobHistory)

  // Determine reputation tier based on score and job count
  const tier = calculateReputationTier(baseScore, totalJobs)

  // Calculate risk score based on patterns
  const riskScore = calculateRiskScore(agentAccount, jobHistory, escrowHistory)

  // Determine trust level
  const trustLevel = determineTrustLevel(baseScore, riskScore, totalJobs)

  // Get earned badges
  const badges = calculateEarnedBadges(agentAccount, jobHistory, escrowHistory)

  // Generate performance history
  const performanceHistory = generatePerformanceHistory(jobHistory, escrowHistory)

  return {
    score: Math.round(baseScore / 100), // Convert from basis points to 0-100 scale
    totalJobs,
    successRate: Math.round(successRate),
    tier,
    badges,
    categoryScores,
    riskScore,
    trustLevel,
    performanceHistory,
  }
}

/**
 * Get agent job history from work orders and escrows
 */
async function getAgentJobHistory(agentAddress: string) {
  const client = getGhostSpeakClient()

  try {
    // Get work orders where this agent is involved
    const workOrdersModule = client.workOrders()
    const allWorkOrders = await workOrdersModule.module.getAllWorkOrders()

    // Filter work orders for this agent
    const agentWorkOrders = allWorkOrders.filter(
      (wo: { data?: { agent?: Address } }) => wo.data?.agent?.toString() === agentAddress
    )

    return agentWorkOrders.map((wo: { data?: WorkOrderData }) => ({
      id: wo.address,
      type: 'work_order',
      status: wo.data?.status || 'unknown',
      createdAt: new Date(Number(wo.data?.createdAt || 0) * 1000),
      completedAt: wo.data?.completedAt ? new Date(Number(wo.data.completedAt) * 1000) : null,
      category: wo.data?.category || 'general',
      amount: wo.data?.amount || BigInt(0),
    }))
  } catch (error) {
    console.warn('Failed to fetch job history:', error)
    return []
  }
}

/**
 * Get agent escrow history
 */
async function getAgentEscrowHistory(agentAddress: string) {
  const client = getGhostSpeakClient()

  try {
    const escrowModule = client.escrow()
    const allEscrows = await escrowModule.module.getAllEscrows()

    // Filter escrows where this agent is involved
    const agentEscrows = allEscrows.filter(
      (escrow: { data?: { agent?: Address } }) => escrow.data?.agent?.toString() === agentAddress
    )

    return agentEscrows.map((escrow: { data?: EscrowData }) => ({
      id: escrow.address,
      status: escrow.data?.status || 'unknown',
      amount: escrow.data?.amount || BigInt(0),
      createdAt: new Date(Number(escrow.data?.createdAt || 0) * 1000),
      completedAt: escrow.data?.completedAt
        ? new Date(Number(escrow.data.completedAt) * 1000)
        : null,
      disputeCount: escrow.data?.disputeCount || 0,
    }))
  } catch (error) {
    console.warn('Failed to fetch escrow history:', error)
    return []
  }
}

/**
 * Get agent marketplace activity
 */
async function getAgentMarketplaceActivity(agentAddress: string) {
  const client = getGhostSpeakClient()

  try {
    const marketplaceModule = client.marketplace()
    const allListings = await marketplaceModule.module.getAllServiceListings()

    // Filter listings created by this agent
    const agentListings = allListings.filter(
      (listing: { data?: { provider?: Address } }) =>
        listing.data?.provider?.toString() === agentAddress
    )

    return {
      totalListings: agentListings.length,
      activeListings: agentListings.filter(
        (l: { data?: { isActive?: boolean } }) => l.data?.isActive
      ).length,
      totalSales: agentListings.reduce(
        (sum: number, l: { data?: { purchaseCount?: number } }) =>
          sum + (l.data?.purchaseCount || 0),
        0
      ),
    }
  } catch (error) {
    console.warn('Failed to fetch marketplace activity:', error)
    return { totalListings: 0, activeListings: 0, totalSales: 0 }
  }
}

/**
 * Calculate category-specific reputation scores
 */
function calculateCategoryScores(jobHistory: JobHistoryItem[]): Record<string, number> {
  const categoryStats: Record<string, { total: number; completed: number }> = {}

  for (const job of jobHistory) {
    const category = job.category || 'general'
    if (!categoryStats[category]) {
      categoryStats[category] = { total: 0, completed: 0 }
    }

    categoryStats[category].total++
    if (job.status === 'completed') {
      categoryStats[category].completed++
    }
  }

  const categoryScores: Record<string, number> = {}
  for (const [category, stats] of Object.entries(categoryStats)) {
    categoryScores[category] =
      stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
  }

  return categoryScores
}

/**
 * Calculate reputation tier based on score and experience
 */
function calculateReputationTier(score: number, totalJobs: number): ReputationMetrics['tier'] {
  if (score >= 9000 && totalJobs >= 100) return 'DIAMOND'
  if (score >= 7500 && totalJobs >= 50) return 'PLATINUM'
  if (score >= 6000 && totalJobs >= 25) return 'GOLD'
  if (score >= 4000 && totalJobs >= 10) return 'SILVER'
  if (score >= 2000 && totalJobs >= 5) return 'BRONZE'
  return 'NEWCOMER'
}

/**
 * Calculate risk score based on behavioral patterns
 */
function calculateRiskScore(
  agentAccount: AgentAccountData,
  jobHistory: JobHistoryItem[],
  escrowHistory: EscrowHistoryItem[]
): number {
  let riskScore = 0

  // Check for suspicious patterns
  const totalJobs = jobHistory.length
  const completedJobs = jobHistory.filter((j) => j.completed).length
  const disputedEscrows = escrowHistory.filter((e) => e.disputeCount > 0).length

  // High dispute rate increases risk
  if (escrowHistory.length > 0) {
    const disputeRate = disputedEscrows / escrowHistory.length
    riskScore += disputeRate * 40
  }

  // Low completion rate increases risk
  if (totalJobs > 0) {
    const completionRate = completedJobs / totalJobs
    if (completionRate < 0.8) {
      riskScore += (0.8 - completionRate) * 50
    }
  }

  // New agents with high scores are suspicious
  if (totalJobs < 5 && agentAccount.reputationScore > 5000) {
    riskScore += 30
  }

  return Math.min(100, Math.round(riskScore))
}

/**
 * Determine trust level based on metrics
 */
function determineTrustLevel(
  score: number,
  riskScore: number,
  totalJobs: number
): ReputationMetrics['trustLevel'] {
  if (riskScore > 70) return 'FLAGGED'
  if (riskScore > 40) return 'LOW'
  if (score > 6000 && totalJobs > 20 && riskScore < 20) return 'HIGH'
  return 'MEDIUM'
}

/**
 * Calculate earned badges based on achievements
 */
function calculateEarnedBadges(
  agentAccount: AgentAccountData,
  jobHistory: JobHistoryItem[],
  escrowHistory: EscrowHistoryItem[]
) {
  const badges: ReputationMetrics['badges'] = []

  const totalJobs = jobHistory.length
  const completedJobs = jobHistory.filter((j) => j.completed).length
  const score = agentAccount.reputationScore || 0

  // Job completion badges
  if (totalJobs >= 100) {
    badges.push({
      type: 'VETERAN',
      name: 'Veteran Agent',
      description: 'Completed 100+ jobs',
      earnedAt: new Date(), // Would track actual earn date
    })
  } else if (totalJobs >= 50) {
    badges.push({
      type: 'EXPERIENCED',
      name: 'Experienced Agent',
      description: 'Completed 50+ jobs',
      earnedAt: new Date(),
    })
  } else if (totalJobs >= 10) {
    badges.push({
      type: 'ESTABLISHED',
      name: 'Established Agent',
      description: 'Completed 10+ jobs',
      earnedAt: new Date(),
    })
  }

  // Quality badges
  if (score >= 8000) {
    badges.push({
      type: 'EXCELLENCE',
      name: 'Excellence Award',
      description: 'Maintained exceptional quality',
      earnedAt: new Date(),
    })
  }

  // Reliability badges
  const completionRate = totalJobs > 0 ? completedJobs / totalJobs : 0
  if (completionRate >= 0.95 && totalJobs >= 20) {
    badges.push({
      type: 'RELIABLE',
      name: 'Highly Reliable',
      description: '95%+ completion rate',
      earnedAt: new Date(),
    })
  }

  return badges
}

/**
 * Generate performance history timeline
 */
function generatePerformanceHistory(
  jobHistory: JobHistoryItem[],
  escrowHistory: EscrowHistoryItem[]
) {
  // Group jobs by month for performance tracking
  const monthlyStats: Record<string, { jobs: number; completed: number; avgQuality: number }> = {}

  for (const job of jobHistory) {
    const month = job.createdAt.toISOString().substring(0, 7) // YYYY-MM
    if (!monthlyStats[month]) {
      monthlyStats[month] = { jobs: 0, completed: 0, avgQuality: 0 }
    }

    monthlyStats[month].jobs++
    if (job.status === 'completed') {
      monthlyStats[month].completed++
    }
  }

  // Convert to performance history format
  return Object.entries(monthlyStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12) // Last 12 months
    .map(([period, stats]) => ({
      period,
      score: stats.completed > 0 ? Math.round((stats.completed / stats.jobs) * 100) : 0,
      jobsCompleted: stats.completed,
      avgQuality: stats.completed > 0 ? Math.round((stats.completed / stats.jobs) * 100) : 0,
    }))
}

/**
 * Hook to get reputation leaderboard
 */
export function useReputationLeaderboard(category?: string, limit = 10) {
  return useQuery({
    queryKey: ['reputation', 'leaderboard', category, limit],
    queryFn: async () => {
      const client = getGhostSpeakClient()
      const agentsModule = client.agents()
      const allAgents = await agentsModule.module.getAllAgents()

      // Filter by category if specified
      let filteredAgents = allAgents
      if (category) {
        filteredAgents = allAgents.filter((agent: { data?: AgentAccountData }) =>
          agent.data?.capabilities?.includes(category)
        )
      }

      // Sort by reputation score and take top N
      return filteredAgents
        .sort(
          (a: { data?: AgentAccountData }, b: { data?: AgentAccountData }) =>
            (b.data?.reputationScore || 0) - (a.data?.reputationScore || 0)
        )
        .slice(0, limit)
        .map((agent: { address: Address; data?: AgentAccountData }) => ({
          address: agent.address,
          name: agent.data?.name || 'Unknown',
          score: Math.round((agent.data?.reputationScore || 0) / 100),
          totalJobs: agent.data?.totalJobsCompleted || 0,
          tier: calculateReputationTier(
            agent.data?.reputationScore || 0,
            agent.data?.totalJobsCompleted || 0
          ),
        }))
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
