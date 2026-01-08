/**
 * Scoring & Reputation Logic
 *
 * Shared logic for calculating user and agent reputation scores.
 * - Ecto Score: For Agent Developers
 * - Ghosthunter Score: For Customers/Verifiers
 * - Ghost Score: For AI Agents
 */

// ─── TIER DEFINITIONS ─────────────────────────────────────────────────────────

// Ecto Score Tiers (for Agent Developers)
export const ECTO_TIERS = {
  LEGEND: { min: 9000, name: 'LEGEND' },
  MASTER: { min: 7500, name: 'MASTER' },
  ARTISAN: { min: 5000, name: 'ARTISAN' },
  APPRENTICE: { min: 2500, name: 'APPRENTICE' },
  NOVICE: { min: 0, name: 'NOVICE' },
} as const

// Ghosthunter Score Tiers (for Customers who hunt for good agents)
export const GHOSTHUNTER_TIERS = {
  LEGENDARY: { min: 9000, name: 'LEGENDARY' },
  ELITE: { min: 7500, name: 'ELITE' },
  VETERAN: { min: 5000, name: 'VETERAN' },
  TRACKER: { min: 2500, name: 'TRACKER' },
  ROOKIE: { min: 0, name: 'ROOKIE' },
} as const

// Ghost Score Tiers (for AI Agents)
export const GHOST_TIERS = {
  DIAMOND: { min: 9500, name: 'DIAMOND' },
  PLATINUM: { min: 9000, name: 'PLATINUM' },
  GOLD: { min: 7500, name: 'GOLD' },
  SILVER: { min: 5000, name: 'SILVER' },
  BRONZE: { min: 2000, name: 'BRONZE' },
  NEWCOMER: { min: 0, name: 'NEWCOMER' },
} as const

// ─── CALCULATION FUNCTIONS ────────────────────────────────────────────────────

/**
 * Calculate Ecto Score for Agent Developers (0-10,000 scale)
 * Measures: agents registered, agent performance, developer tenure
 */
export function calculateEctoScore({
  agentsRegistered,
  totalAgentGhostScore,
  totalAgentJobs,
  accountAge,
  votesCast,
}: {
  agentsRegistered: number
  totalAgentGhostScore: number // Sum of Ghost Scores across all their agents
  totalAgentJobs: number // Total jobs completed by all their agents
  accountAge: number
  votesCast: number // Number of observation votes cast
}): number {
  const ageInDays = accountAge / (1000 * 60 * 60 * 24)
  let score = 0

  // Agent creation points (up to 2000 points)
  // More agents = more experienced developer
  score += Math.min(agentsRegistered * 500, 2000)

  // Agent quality points (up to 4000 points)
  // Average Ghost Score of their agents (normalized)
  if (agentsRegistered > 0) {
    const avgAgentScore = totalAgentGhostScore / agentsRegistered
    score += Math.min((avgAgentScore / 10000) * 4000, 4000)
  }

  // Agent productivity points (up to 2500 points)
  // Total jobs completed by their agents
  score += Math.min(totalAgentJobs * 25, 2500)

  // Developer tenure points (up to 1500 points)
  score += Math.min(ageInDays * 10, 1500)

  // Observation voting points (up to 1000 points)
  // 5 points per vote
  score += Math.min(votesCast * 5, 1000)

  return Math.min(Math.round(score), 10000)
}

/**
 * Get Ecto Score tier for Agent Developers
 */
export function getEctoScoreTier(score: number): string {
  if (score >= ECTO_TIERS.LEGEND.min) return ECTO_TIERS.LEGEND.name
  if (score >= ECTO_TIERS.MASTER.min) return ECTO_TIERS.MASTER.name
  if (score >= ECTO_TIERS.ARTISAN.min) return ECTO_TIERS.ARTISAN.name
  if (score >= ECTO_TIERS.APPRENTICE.min) return ECTO_TIERS.APPRENTICE.name
  return ECTO_TIERS.NOVICE.name
}

/**
 * Calculate Ghosthunter Score for Customers AND Agents (0-10,000 scale)
 * Measures: verifications performed, reviews written, accuracy of evaluations
 */
export function calculateGhosthunterScore({
  totalVerifications,
  totalPayments,
  reviewsWritten,
  accountAge,
  boost = 0,
}: {
  totalVerifications: number
  totalPayments: number
  reviewsWritten: number
  accountAge: number
  boost?: number
}): number {
  const ageInDays = accountAge / (1000 * 60 * 60 * 24)
  let score = boost

  // Verification points (up to 3500 points)
  // Each verification shows you're actively hunting/evaluating agents
  score += Math.min(totalVerifications * 150, 3500)

  // Transaction points (up to 2500 points)
  // Completed payments show you've actually used agents
  score += Math.min(totalPayments * 100, 2500)

  // Review contribution points (up to 2500 points)
  // Writing reviews helps the community
  score += Math.min(reviewsWritten * 200, 2500)

  // Tenure bonus (up to 1500 points)
  score += Math.min(ageInDays * 10, 1500)

  return Math.min(Math.round(score), 10000)
}

/**
 * Get Ghosthunter Score tier for Customers/Agents
 */
export function getGhosthunterScoreTier(score: number): string {
  if (score >= GHOSTHUNTER_TIERS.LEGENDARY.min) return GHOSTHUNTER_TIERS.LEGENDARY.name
  if (score >= GHOSTHUNTER_TIERS.ELITE.min) return GHOSTHUNTER_TIERS.ELITE.name
  if (score >= GHOSTHUNTER_TIERS.VETERAN.min) return GHOSTHUNTER_TIERS.VETERAN.name
  if (score >= GHOSTHUNTER_TIERS.TRACKER.min) return GHOSTHUNTER_TIERS.TRACKER.name
  return GHOSTHUNTER_TIERS.ROOKIE.name
}

/**
 * Get Ghost Score tier for AI Agents
 */
export function getGhostScoreTier(score: number): string {
  if (score >= GHOST_TIERS.DIAMOND.min) return GHOST_TIERS.DIAMOND.name
  if (score >= GHOST_TIERS.PLATINUM.min) return GHOST_TIERS.PLATINUM.name
  if (score >= GHOST_TIERS.GOLD.min) return GHOST_TIERS.GOLD.name
  if (score >= GHOST_TIERS.SILVER.min) return GHOST_TIERS.SILVER.name
  if (score >= GHOST_TIERS.BRONZE.min) return GHOST_TIERS.BRONZE.name
  return GHOST_TIERS.NEWCOMER.name
}
