/**
 * GitHub Reputation Adapter
 *
 * Fetches reputation data from GitHub based on developer activity.
 * Reliability: 0.7 (external source, not payment-verified)
 *
 * Scoring based on:
 * - Total commits
 * - Repository stars
 * - Pull request merge rate
 * - Issue resolution rate
 * - Account age and activity
 */

import {
  BaseReputationAdapter,
  ReputationSource,
  type SourceReputationData,
  type ReputationSourceConfig,
} from './ReputationSourceAdapter.js'

/**
 * GitHub user statistics
 */
export interface GitHubStats {
  username: string
  totalCommits: number
  totalStars: number
  totalRepositories: number
  totalPullRequests: number
  mergedPullRequests: number
  totalIssues: number
  closedIssues: number
  followers: number
  following: number
  accountAgeYears: number
  contributionsLastYear: number
}

/**
 * GitHub API response types
 */
interface GitHubUser {
  login: string
  public_repos: number
  followers: number
  following: number
  created_at: string
}

interface GitHubRepository {
  stargazers_count: number
  forks_count: number
}

/**
 * GitHub adapter for reputation scoring
 */
export class GitHubAdapter extends BaseReputationAdapter {
  private apiToken?: string
  private apiEndpoint = 'https://api.github.com'
  private rateLimitRemaining = 60 // GitHub unauthenticated limit

  constructor(config: ReputationSourceConfig) {
    super(config)
    this.apiToken = config.config.apiToken
  }

  get source(): ReputationSource {
    return ReputationSource.GitHub
  }

  /**
   * Fetch reputation data from GitHub
   *
   * @param agentId - Agent identifier (should be GitHub username or linked account)
   * @returns Normalized reputation data
   */
  async fetchReputationData(agentId: string): Promise<SourceReputationData> {
    // agentId should map to GitHub username
    // In production, this would lookup the linked GitHub account
    const githubUsername = this.extractGitHubUsername(agentId)

    if (!githubUsername) {
      throw new Error(`No GitHub username found for agent: ${agentId}`)
    }

    // Fetch GitHub stats
    const stats = await this.fetchGitHubStats(githubUsername)

    // Calculate score
    const score = this.calculateScore(stats)

    // Normalize to 0-1000
    const normalizedScore = this.normalizeScore(score)

    // Calculate reliability based on data quality
    const reliability = this.calculateReliability(stats)

    return {
      source: this.source,
      score: normalizedScore,
      dataPoints: this.calculateDataPoints(stats),
      reliability,
      rawData: stats,
      timestamp: new Date(),
    }
  }

  /**
   * Extract GitHub username from agent ID
   * In production, this would query a registry of linked accounts
   */
  private extractGitHubUsername(agentId: string): string | null {
    // For now, assume agentId metadata contains github_username
    // In production: query on-chain metadata or registry
    const metadata = this.config.config.agentMetadata?.[agentId]
    return metadata?.github_username || null
  }

  /**
   * Fetch GitHub statistics
   *
   * @param username - GitHub username
   * @returns GitHub statistics
   */
  private async fetchGitHubStats(username: string): Promise<GitHubStats> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    }

    if (this.apiToken) {
      headers['Authorization'] = `Bearer ${this.apiToken}`
    }

    // Fetch user data
    const userResponse = await fetch(`${this.apiEndpoint}/users/${username}`, { headers })
    if (!userResponse.ok) {
      throw new Error(`GitHub API error: ${userResponse.status} ${userResponse.statusText}`)
    }

    const user: GitHubUser = await userResponse.json()

    // Check rate limit
    const rateLimit = userResponse.headers.get('X-RateLimit-Remaining')
    if (rateLimit) {
      this.rateLimitRemaining = parseInt(rateLimit, 10)
    }

    // Fetch repositories
    const reposResponse = await fetch(`${this.apiEndpoint}/users/${username}/repos?per_page=100`, {
      headers,
    })
    if (!reposResponse.ok) {
      throw new Error(`GitHub API error: ${reposResponse.status}`)
    }

    const repos: GitHubRepository[] = await reposResponse.json()

    // Calculate total stars
    const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0)

    // Calculate account age
    const createdAt = new Date(user.created_at)
    const accountAgeYears = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365)

    // TODO: Fetch commit count, PRs, issues (requires more API calls)
    // For MVP, we'll estimate based on repos and stars

    return {
      username: user.login,
      totalCommits: this.estimateCommits(repos.length, totalStars),
      totalStars,
      totalRepositories: user.public_repos,
      totalPullRequests: 0, // Requires GraphQL API
      mergedPullRequests: 0,
      totalIssues: 0,
      closedIssues: 0,
      followers: user.followers,
      following: user.following,
      accountAgeYears,
      contributionsLastYear: 0, // Requires GraphQL API
    }
  }

  /**
   * Estimate commit count based on repos and stars
   */
  private estimateCommits(repoCount: number, stars: number): number {
    // Rough estimation: 50 commits per repo + bonus for stars
    return repoCount * 50 + stars * 2
  }

  /**
   * Calculate reputation score from GitHub stats
   *
   * Scoring factors:
   * - Commit activity: 30%
   * - Repository popularity (stars): 25%
   * - Account age and consistency: 20%
   * - Community engagement (followers): 15%
   * - Repository count: 10%
   *
   * @param stats - GitHub statistics
   * @returns Raw score (0-100)
   */
  private calculateScore(stats: GitHubStats): number {
    // 1. Commit activity (30%)
    // 0-100 commits = 0-10, 100-1000 = 10-20, 1000+ = 20-30
    let commitScore = 0
    if (stats.totalCommits >= 10000) {
      commitScore = 30
    } else if (stats.totalCommits >= 1000) {
      commitScore = 20 + ((stats.totalCommits - 1000) / 9000) * 10
    } else if (stats.totalCommits >= 100) {
      commitScore = 10 + ((stats.totalCommits - 100) / 900) * 10
    } else {
      commitScore = (stats.totalCommits / 100) * 10
    }

    // 2. Repository popularity (25%)
    // 0-10 stars = 0-5, 10-100 = 5-15, 100+ = 15-25
    let starScore = 0
    if (stats.totalStars >= 1000) {
      starScore = 25
    } else if (stats.totalStars >= 100) {
      starScore = 15 + ((stats.totalStars - 100) / 900) * 10
    } else if (stats.totalStars >= 10) {
      starScore = 5 + ((stats.totalStars - 10) / 90) * 10
    } else {
      starScore = (stats.totalStars / 10) * 5
    }

    // 3. Account age and consistency (20%)
    // New accounts (<1 yr) = 5, 1-3 yrs = 10, 3-5 yrs = 15, 5+ yrs = 20
    let ageScore = 0
    if (stats.accountAgeYears >= 5) {
      ageScore = 20
    } else if (stats.accountAgeYears >= 3) {
      ageScore = 15
    } else if (stats.accountAgeYears >= 1) {
      ageScore = 10
    } else {
      ageScore = 5
    }

    // 4. Community engagement (15%)
    // Followers: 0-10 = 0-5, 10-100 = 5-10, 100+ = 10-15
    let followerScore = 0
    if (stats.followers >= 1000) {
      followerScore = 15
    } else if (stats.followers >= 100) {
      followerScore = 10 + ((stats.followers - 100) / 900) * 5
    } else if (stats.followers >= 10) {
      followerScore = 5 + ((stats.followers - 10) / 90) * 5
    } else {
      followerScore = (stats.followers / 10) * 5
    }

    // 5. Repository count (10%)
    // 0-5 repos = 0-3, 5-20 = 3-7, 20+ = 7-10
    let repoScore = 0
    if (stats.totalRepositories >= 50) {
      repoScore = 10
    } else if (stats.totalRepositories >= 20) {
      repoScore = 7 + ((stats.totalRepositories - 20) / 30) * 3
    } else if (stats.totalRepositories >= 5) {
      repoScore = 3 + ((stats.totalRepositories - 5) / 15) * 4
    } else {
      repoScore = (stats.totalRepositories / 5) * 3
    }

    return commitScore + starScore + ageScore + followerScore + repoScore
  }

  /**
   * Validate GitHub data
   *
   * @param data - Data to validate
   * @returns True if valid
   */
  validateData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false
    }

    const stats = data.rawData as GitHubStats
    if (!stats) {
      return false
    }

    // Check required fields
    if (typeof stats.username !== 'string') return false
    if (typeof stats.totalCommits !== 'number') return false
    if (typeof stats.accountAgeYears !== 'number') return false

    // Account age should be positive
    if (stats.accountAgeYears < 0) return false

    return true
  }

  /**
   * Normalize score to 0-1000 scale
   *
   * @param rawScore - Raw score (0-100)
   * @returns Normalized score (0-1000)
   */
  normalizeScore(rawScore: number): number {
    // Convert 0-100 to 0-1000
    const normalized = rawScore * 10
    return this.clampScore(normalized)
  }

  /**
   * Calculate reliability based on data quality
   *
   * GitHub has moderate reliability (0.7) as it's external and not payment-verified
   *
   * @param stats - GitHub statistics
   * @returns Reliability (0-1)
   */
  calculateReliability(stats: GitHubStats): number {
    let reliability = 0.7 // Base reliability for GitHub

    // Reduce reliability for very new accounts
    if (stats.accountAgeYears < 0.5) {
      reliability = 0.4
    } else if (stats.accountAgeYears < 1) {
      reliability = 0.5
    }

    // Reduce reliability for low activity
    if (stats.totalCommits < 10) {
      reliability *= 0.7
    }

    return reliability
  }

  /**
   * Calculate total data points
   */
  private calculateDataPoints(stats: GitHubStats): number {
    return (
      stats.totalCommits +
      stats.totalStars +
      stats.totalRepositories +
      stats.followers +
      stats.totalPullRequests +
      stats.totalIssues
    )
  }

  /**
   * Get remaining rate limit
   */
  getRateLimitRemaining(): number {
    return this.rateLimitRemaining
  }
}
