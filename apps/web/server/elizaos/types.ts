/**
 * Shared types for ElizaOS actions and runtime
 */

export interface Credential {
  type: string
  credentialId: string
  issuedAt: number
  isValid: boolean
  validUntil?: number

  // Specific fields depending on credential type
  tier?: string
  milestone?: number
  grade?: string
  rating?: number
  successRate?: number
  did?: string

  // Model provenance
  modelName?: string
  modelProvider?: string
  modelVersion?: string

  // TEE
  teeType?: string
  teeProvider?: string
}

export interface UserDashboardData {
  user: {
    walletAddress: string
    username?: string
    avatar?: string
    createdAt: number
    lastLoginAt?: number
  }
  roles: {
    isAgentDeveloper: boolean
    isCustomer: boolean
  }
  reputation: {
    ecto: {
      score: number
      tier: string
      agentsRegistered: number
    } | null
    ghosthunter: {
      score: number
      tier: string
    } | null
  }
  stats: {
    verificationsThisMonth: number
    freeVerificationsRemaining: number
    totalVerifications: number
    totalTransactions: number
    totalSpent: number
    apiCallsThisMonth: number
  }
  staking: {
    amountStaked: number
    tier: string
    reputationBoostBps: number
    unlockAt: number
    hasVerifiedBadge: boolean
    hasPremiumBenefits: boolean
  } | null
  recentActivity: Array<{
    type: string
    description: string
    timestamp: number
    status?: string
    transactionSignature?: string
  }>
  gamification: {
    streak: {
      days: number
      isActive: boolean
    }
    achievements: Array<{
      id: string
      name: string
      description: string
      unlocked: boolean
      unlockedAt?: number
      category: 'general' | 'developer' | 'customer'
    }>
  }
}
