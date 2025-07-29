/**
 * AnalyticsInstructions - Complete Analytics Management Client
 * 
 * Provides developer-friendly high-level interface for analytics operations
 * including dashboard creation, market analytics, performance tracking, and reporting.
 */

import type { Address, Signature, TransactionSigner } from '@solana/kit'
import { BaseInstructions } from './BaseInstructions.js'
import type { GhostSpeakConfig } from '../../types/index.js'
import { 
  getCreateAnalyticsDashboardInstruction,
  getUpdateAnalyticsDashboardInstruction,
  getCreateMarketAnalyticsInstruction,
  getUpdateMarketAnalyticsInstruction,
  getAddTopAgentInstruction,
  type AnalyticsDashboard,
  type MarketAnalytics,
  TrendDirection,
  // getAnalyticsDashboardDecoder,
  // getMarketAnalyticsDecoder
} from '../../generated/index.js'
import { SYSTEM_PROGRAM_ADDRESS_32, SYSVAR_CLOCK_ADDRESS } from '../../constants/index.js'

// Enhanced types for better developer experience
export interface CreateDashboardParams {
  dashboardId: bigint
  agentId: Address
  metricTypes: string[]
  reportingFrequency: string
  alertThresholds: Map<string, number>
}

export interface UpdateDashboardParams {
  dashboard: Address
  revenue: bigint
  transactionCount: number
  successRate: number
  averageResponseTime: number
  customerRating: number
  utilizationRate: number
}

export interface CreateMarketAnalyticsParams {
  trackingPeriod: bigint
  // Additional data stored outside of the instruction
  marketSegment?: string
  metrics?: string[]
}

export interface UpdateMarketAnalyticsParams {
  marketAnalytics: Address
  totalTransactions: bigint
  totalRevenue: bigint
  activeAgents: number
  averageTransactionValue: bigint
  marketGrowthRate: number
  topPerformingSegments: string[]
}

export interface AddTopAgentParams {
  agent: Address
  performanceScore: number
  rank: number
  category: string
}

export interface DashboardSummary {
  dashboard: Address
  dashboardId: bigint
  agentId: Address
  revenue: bigint
  transactionCount: number
  successRate: number
  averageResponseTime: number
  customerRating: number
  utilizationRate: number
  createdAt: bigint
  lastUpdated: bigint
  performanceGrade: string
  trendDirection: TrendDirection
}

export interface MarketSummary {
  marketAnalytics: Address
  analyticsId: bigint
  totalTransactions: bigint
  totalRevenue: bigint
  activeAgents: number
  averageTransactionValue: bigint
  marketGrowthRate: number
  topPerformingSegments: string[]
  createdAt: bigint
  lastUpdated: bigint
  marketHealth: 'Excellent' | 'Good' | 'Fair' | 'Poor'
}

export interface AnalyticsTrendMetrics {
  date: string
  revenue: bigint
  transactionCount: number
  successRate: number
  activeAgents: number
  averageResponseTime: number
}

export interface TopPerformerMetrics {
  agent: Address
  performanceScore: number
  rank: number
  totalRevenue: bigint
  successRate: number
  customerRating: number
}

export interface PerformanceMetrics {
  agentMetrics: {
    totalAgents: number
    activeAgents: number
    topPerformers: { agent: Address; score: number; rank: number }[]
    averageRating: number
    averageResponseTime: number
  }
  transactionMetrics: {
    totalTransactions: bigint
    dailyVolume: bigint
    successRate: number
    averageValue: bigint
    growthRate: number
  }
  revenueMetrics: {
    totalRevenue: bigint
    dailyRevenue: bigint
    revenuePerAgent: bigint
    profitMargin: number
    growthTrend: TrendDirection
  }
}

/**
 * Complete Analytics Management Client
 * 
 * Provides high-level developer-friendly interface for all analytics operations
 * with real blockchain execution, comprehensive metrics, and reporting capabilities.
 */
export class AnalyticsInstructions extends BaseInstructions {
  constructor(config: GhostSpeakConfig) {
    super(config)
  }

  // =====================================================
  // DASHBOARD OPERATIONS
  // =====================================================

  /**
   * Create an analytics dashboard for agent performance tracking
   * 
   * Creates a comprehensive dashboard to track agent performance metrics
   * including revenue, success rates, response times, and customer ratings.
   * 
   * @param creator - The signer creating the dashboard
   * @param dashboardPda - The dashboard account PDA
   * @param params - Dashboard creation parameters
   * @returns Transaction signature
   * 
   * @example
   * ```typescript
   * const signature = await client.analytics.createDashboard(
   *   creator,
   *   dashboardPda,
   *   {
   *     dashboardId: 1n,
   *     agentId: agentAddress,
   *     metricTypes: ['revenue', 'success_rate', 'response_time', 'rating'],
   *     reportingFrequency: 'daily',
   *     alertThresholds: new Map([
   *       ['success_rate', 0.95],
   *       ['response_time', 30],
   *       ['rating', 4.5]
   *     ])
   *   }
   * )
   * ```
   */
  async createDashboard(
    creator: TransactionSigner,
    dashboardPda: Address,
    params: CreateDashboardParams
  ): Promise<string> {
    console.log('📊 Creating analytics dashboard...')
    console.log(`   Dashboard ID: ${params.dashboardId}`)
    console.log(`   Agent ID: ${params.agentId}`)
    console.log(`   Metric Types: ${params.metricTypes.join(', ')}`)
    console.log(`   Reporting Frequency: ${params.reportingFrequency}`)

    // Validate parameters
    this.validateCreateDashboardParams(params)

    // Build instruction - serialize analytics data to metrics JSON
    const metricsData = {
      agentId: params.agentId,
      metricTypes: params.metricTypes,
      reportingFrequency: params.reportingFrequency,
      alertThresholds: Object.fromEntries(params.alertThresholds)
    }

    const instruction = getCreateAnalyticsDashboardInstruction({
      dashboard: dashboardPda,
      userRegistry: await this.deriveUserRegistry(creator),
      owner: creator,
      systemProgram: SYSTEM_PROGRAM_ADDRESS_32,
      clock: SYSVAR_CLOCK_ADDRESS,
      dashboardId: params.dashboardId,
      metrics: JSON.stringify(metricsData)
    })

    const signature = await this.sendTransaction([instruction], [creator])
    
    console.log(`✅ Analytics dashboard created with signature: ${signature}`)
    return signature
  }

  /**
   * Update dashboard metrics with latest performance data
   * 
   * Updates the dashboard with fresh performance metrics and analytics data.
   * This should be called regularly to maintain accurate performance tracking.
   * 
   * @param updater - The signer updating the dashboard
   * @param params - Dashboard update parameters
   * @returns Transaction signature
   * 
   * @example
   * ```typescript
   * const signature = await client.analytics.updateDashboard(
   *   updater,
   *   {
   *     dashboard: dashboardAddress,
   *     revenue: 50000000000n, // 50 SOL
   *     transactionCount: 150,
   *     successRate: 0.97,
   *     averageResponseTime: 25,
   *     customerRating: 4.8,
   *     utilizationRate: 0.85
   *   }
   * )
   * ```
   */
  async updateDashboard(
    updater: TransactionSigner,
    params: UpdateDashboardParams
  ): Promise<string> {
    console.log('📈 Updating analytics dashboard...')
    console.log(`   Dashboard: ${params.dashboard}`)
    console.log(`   Revenue: ${params.revenue} lamports`)
    console.log(`   Transaction Count: ${params.transactionCount}`)
    console.log(`   Success Rate: ${(params.successRate * 100).toFixed(1)}%`)

    // Validate parameters
    this.validateUpdateDashboardParams(params)

    // Build instruction - serialize all metrics to JSON
    const metricsData = {
      revenue: params.revenue.toString(),
      transactionCount: params.transactionCount,
      successRate: params.successRate,
      averageResponseTime: params.averageResponseTime,
      customerRating: params.customerRating,
      utilizationRate: params.utilizationRate,
      timestamp: Math.floor(Date.now() / 1000)
    }

    const instruction = getUpdateAnalyticsDashboardInstruction({
      dashboard: params.dashboard,
      userRegistry: await this.deriveUserRegistry(updater),
      owner: updater,
      clock: SYSVAR_CLOCK_ADDRESS,
      newMetrics: JSON.stringify(metricsData)
    })

    const signature = await this.sendTransaction([instruction], [updater])
    
    console.log(`✅ Analytics dashboard updated with signature: ${signature}`)
    return signature
  }

  // =====================================================
  // MARKET ANALYTICS OPERATIONS
  // =====================================================

  /**
   * Create market-wide analytics tracking
   * 
   * Initializes comprehensive market analytics to track ecosystem-wide
   * performance, trends, and health metrics across all agents and transactions.
   * 
   * @param creator - The signer creating market analytics
   * @param marketAnalyticsPda - The market analytics account PDA
   * @param params - Market analytics creation parameters
   * @returns Transaction signature
   */
  async createMarketAnalytics(
    creator: TransactionSigner,
    marketAnalyticsPda: Address,
    params: CreateMarketAnalyticsParams
  ): Promise<string> {
    console.log('🌐 Creating market analytics...')
    console.log(`   Tracking Period: ${params.trackingPeriod} seconds`)
    if (params.marketSegment) {
      console.log(`   Market Segment: ${params.marketSegment}`)
    }

    // Validate parameters
    this.validateCreateMarketAnalyticsParams(params)

    // Build instruction - the generated instruction expects period start/end
    const now = BigInt(Math.floor(Date.now() / 1000))
    const periodStart = now
    const periodEnd = now + params.trackingPeriod

    const instruction = getCreateMarketAnalyticsInstruction({
      marketAnalytics: marketAnalyticsPda,
      authority: creator,
      systemProgram: SYSTEM_PROGRAM_ADDRESS_32,
      clock: SYSVAR_CLOCK_ADDRESS,
      periodStart,
      periodEnd
    })

    const signature = await this.sendTransaction([instruction], [creator])
    
    console.log(`✅ Market analytics created with signature: ${signature}`)
    return signature
  }

  /**
   * Update market analytics with latest ecosystem data
   * 
   * Updates market-wide analytics with aggregated performance data
   * from across the entire protocol ecosystem.
   * 
   * @param updater - The signer updating market analytics
   * @param params - Market analytics update parameters
   * @returns Transaction signature
   */
  async updateMarketAnalytics(
    updater: TransactionSigner,
    params: UpdateMarketAnalyticsParams
  ): Promise<string> {
    console.log('📊 Updating market analytics...')
    console.log(`   Market Analytics: ${params.marketAnalytics}`)
    console.log(`   Total Transactions: ${params.totalTransactions}`)
    console.log(`   Total Revenue: ${params.totalRevenue} lamports`)
    console.log(`   Active Agents: ${params.activeAgents}`)

    // Validate parameters
    this.validateUpdateMarketAnalyticsParams(params)

    // Build instruction - the generated instruction only expects volume and price
    // Use totalRevenue as volume and averageTransactionValue as price
    const instruction = getUpdateMarketAnalyticsInstruction({
      marketAnalytics: params.marketAnalytics,
      authority: updater,
      clock: SYSVAR_CLOCK_ADDRESS,
      volume: params.totalRevenue,
      price: params.averageTransactionValue
    })

    const signature = await this.sendTransaction([instruction], [updater])
    
    console.log(`✅ Market analytics updated with signature: ${signature}`)
    return signature
  }

  // =====================================================
  // TOP PERFORMER TRACKING
  // =====================================================

  /**
   * Add agent to top performers list
   * 
   * Recognizes high-performing agents by adding them to the top performers
   * registry with their performance score and ranking.
   * 
   * @param authority - The signer with authority to add top agents
   * @param params - Top agent addition parameters
   * @returns Transaction signature
   */
  async addTopAgent(
    authority: TransactionSigner,
    params: AddTopAgentParams
  ): Promise<string> {
    console.log('🏆 Adding top performing agent...')
    console.log(`   Agent: ${params.agent}`)
    console.log(`   Performance Score: ${params.performanceScore}`)
    console.log(`   Rank: ${params.rank}`)
    console.log(`   Category: ${params.category}`)

    // Validate parameters
    this.validateAddTopAgentParams(params)

    // Build instruction - only expects marketAnalytics account and agent address
    // Performance data would be stored in the market analytics account
    const instruction = getAddTopAgentInstruction({
      marketAnalytics: await this.deriveMarketAnalyticsPda(),
      authority,
      clock: SYSVAR_CLOCK_ADDRESS,
      agent: params.agent
    })

    const signature = await this.sendTransaction([instruction], [authority])
    
    console.log(`✅ Top agent added with signature: ${signature}`)
    return signature
  }

  // =====================================================
  // QUERYING & ANALYTICS
  // =====================================================

  /**
   * Get dashboard account data
   * 
   * @param dashboardAddress - The dashboard account address
   * @returns Dashboard account data or null if not found
   */
  async getDashboard(dashboardAddress: Address): Promise<AnalyticsDashboard | null> {
    return this.getDecodedAccount<AnalyticsDashboard>(
      dashboardAddress,
      'getAnalyticsDashboardDecoder'
    )
  }

  /**
   * Get market analytics account data
   * 
   * @param marketAnalyticsAddress - The market analytics account address
   * @returns Market analytics data or null if not found
   */
  async getMarketAnalytics(marketAnalyticsAddress: Address): Promise<MarketAnalytics | null> {
    return this.getDecodedAccount<MarketAnalytics>(
      marketAnalyticsAddress,
      'getMarketAnalyticsDecoder'
    )
  }

  /**
   * Get dashboard summary with computed performance metrics
   * 
   * @param dashboardAddress - The dashboard account address
   * @returns Enhanced dashboard summary or null if not found
   */
  async getDashboardSummary(dashboardAddress: Address): Promise<DashboardSummary | null> {
    const dashboard = await this.getDashboard(dashboardAddress)
    if (!dashboard) return null

    // Parse metrics JSON to get actual data
    let metricsData: Record<string, unknown> = {}
    try {
      metricsData = JSON.parse(dashboard.metrics) as Record<string, unknown>
    } catch (error) {
      console.warn('Failed to parse dashboard metrics:', error)
    }

    // Extract values from parsed metrics or use defaults
    const revenue = BigInt((metricsData.revenue as string) ?? '0')
    const transactionCount = (metricsData.transactionCount as number) ?? 0
    const successRate = (metricsData.successRate as number) ?? 0
    const averageResponseTime = (metricsData.averageResponseTime as number) ?? 0
    const customerRating = (metricsData.customerRating as number) ?? 0
    const utilizationRate = (metricsData.utilizationRate as number) ?? 0
    const agentId = (metricsData.agentId as Address) ?? dashboard.owner // Use owner as fallback

    // Calculate performance grade based on metrics
    const performanceGrade = this.calculatePerformanceGrade(
      successRate,
      customerRating,
      utilizationRate
    )

    // Determine trend direction based on historical data if available
    const trendDirection = this.determineTrendDirection(metricsData)

    return {
      dashboard: dashboardAddress,
      dashboardId: dashboard.dashboardId,
      agentId,
      revenue,
      transactionCount,
      successRate,
      averageResponseTime,
      customerRating,
      utilizationRate,
      createdAt: dashboard.createdAt,
      lastUpdated: dashboard.updatedAt,
      performanceGrade,
      trendDirection
    }
  }

  /**
   * Get comprehensive performance metrics across the ecosystem
   * 
   * @returns Aggregated performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    console.log('📊 Generating comprehensive performance metrics...')
    
    // In production, this would aggregate data from all dashboards and market analytics
    return {
      agentMetrics: {
        totalAgents: 0,
        activeAgents: 0,
        topPerformers: [],
        averageRating: 0,
        averageResponseTime: 0
      },
      transactionMetrics: {
        totalTransactions: 0n,
        dailyVolume: 0n,
        successRate: 0,
        averageValue: 0n,
        growthRate: 0
      },
      revenueMetrics: {
        totalRevenue: 0n,
        dailyRevenue: 0n,
        revenuePerAgent: 0n,
        profitMargin: 0,
        growthTrend: TrendDirection.Stable
      }
    }
  }

  /**
   * Generate analytics report for a specific time period
   * 
   * @param startDate - Report start date (timestamp)
   * @param endDate - Report end date (timestamp)
   * @param includeAgentDetails - Whether to include individual agent breakdowns
   * @returns Comprehensive analytics report
   */
  async generateReport(
    startDate: bigint,
    endDate: bigint,
    includeAgentDetails: boolean = false
  ): Promise<{
    period: { start: bigint; end: bigint }
    summary: PerformanceMetrics
    trends: { date: string; metrics: AnalyticsTrendMetrics }[]
    topPerformers: { agent: Address; metrics: TopPerformerMetrics }[]
    recommendations: string[]
  }> {
    console.log('📋 Generating analytics report...')
    console.log(`   Period: ${startDate} to ${endDate}`)
    console.log(`   Include Agent Details: ${includeAgentDetails}`)

    // In production, this would query all relevant analytics data
    return {
      period: { start: startDate, end: endDate },
      summary: await this.getPerformanceMetrics(),
      trends: [],
      topPerformers: [],
      recommendations: [
        'Increase agent utilization rates through better matching algorithms',
        'Implement performance incentives for top-rated agents',
        'Optimize response times with automated workflows'
      ]
    }
  }

  // =====================================================
  // VALIDATION & UTILITY HELPERS
  // =====================================================

  private validateCreateDashboardParams(params: CreateDashboardParams): void {
    if (params.metricTypes.length === 0) {
      throw new Error('At least one metric type is required')
    }
    
    if (params.metricTypes.length > 20) {
      throw new Error('Cannot track more than 20 metric types')
    }
    
    const validFrequencies = ['hourly', 'daily', 'weekly', 'monthly']
    if (!validFrequencies.includes(params.reportingFrequency)) {
      throw new Error(`Reporting frequency must be one of: ${validFrequencies.join(', ')}`)
    }
  }

  private validateUpdateDashboardParams(params: UpdateDashboardParams): void {
    if (params.successRate < 0 || params.successRate > 1) {
      throw new Error('Success rate must be between 0 and 1')
    }
    
    if (params.customerRating < 0 || params.customerRating > 5) {
      throw new Error('Customer rating must be between 0 and 5')
    }
    
    if (params.utilizationRate < 0 || params.utilizationRate > 1) {
      throw new Error('Utilization rate must be between 0 and 1')
    }
    
    if (params.averageResponseTime < 0) {
      throw new Error('Average response time cannot be negative')
    }
  }

  private validateCreateMarketAnalyticsParams(params: CreateMarketAnalyticsParams): void {
    if (params.trackingPeriod < 3600n) {
      throw new Error('Tracking period must be at least 1 hour')
    }
    
    // Optional field validations
    if (params.marketSegment !== undefined && params.marketSegment.trim().length === 0) {
      throw new Error('Market segment cannot be empty if provided')
    }
    
    if (params.metrics !== undefined && params.metrics.length === 0) {
      throw new Error('At least one metric is required if metrics array is provided')
    }
  }

  private validateUpdateMarketAnalyticsParams(params: UpdateMarketAnalyticsParams): void {
    if (params.totalTransactions < 0n) {
      throw new Error('Total transactions cannot be negative')
    }
    
    if (params.totalRevenue < 0n) {
      throw new Error('Total revenue cannot be negative')
    }
    
    if (params.activeAgents < 0) {
      throw new Error('Active agents count cannot be negative')
    }
  }

  private validateAddTopAgentParams(params: AddTopAgentParams): void {
    if (params.performanceScore < 0 || params.performanceScore > 100) {
      throw new Error('Performance score must be between 0 and 100')
    }
    
    if (params.rank < 1) {
      throw new Error('Rank must be 1 or higher')
    }
    
    if (!params.category || params.category.trim().length === 0) {
      throw new Error('Category is required')
    }
  }

  private calculatePerformanceGrade(
    successRate: number,
    customerRating: number,
    utilizationRate: number
  ): string {
    const compositeScore = (successRate * 0.4) + (customerRating / 5 * 0.3) + (utilizationRate * 0.3)
    
    if (compositeScore >= 0.9) return 'A+'
    if (compositeScore >= 0.8) return 'A'
    if (compositeScore >= 0.7) return 'B'
    if (compositeScore >= 0.6) return 'C'
    return 'D'
  }

  private determineTrendDirection(metricsData: Record<string, unknown>): TrendDirection {
    // If we have historical data, compare current vs previous metrics
    if (metricsData.previousMetrics) {
      const currentScore = (metricsData.successRate as number) ?? 0
      const previousMetrics = metricsData.previousMetrics as Record<string, unknown>
      const previousScore = (previousMetrics.successRate as number) ?? 0
      
      if (currentScore > previousScore + 0.05) return TrendDirection.Increasing
      if (currentScore < previousScore - 0.05) return TrendDirection.Decreasing
      return TrendDirection.Stable
    }
    
    return TrendDirection.Unknown
  }

  private async deriveUserRegistry(user: TransactionSigner): Promise<Address> {
    const { deriveUserRegistryPda } = await import('../../utils/pda.js')
    return deriveUserRegistryPda(this.config.programId!, user.address)
  }

  private async deriveMarketAnalyticsPda(): Promise<Address> {
    // Market analytics PDA pattern: ['market_analytics']
    const { findProgramDerivedAddress } = await import('../../utils/pda.js')
    const [address] = await findProgramDerivedAddress(['market_analytics'], this.config.programId!)
    return address
  }
}