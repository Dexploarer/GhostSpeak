/**
 * Analytics Helper Utilities
 * 
 * Comprehensive utilities for metrics aggregation, reporting,
 * dashboard management, and market intelligence.
 */

import type { Address } from '@solana/kit'
import { getAddressEncoder, getProgramDerivedAddress } from '@solana/kit'
import {
  TrendDirection,
  ReportType,
  type AnalyticsDashboard,
  type MarketAnalytics
} from '../generated/index.js'

// Define missing types locally
export interface PerformanceMetrics {
  responseTime: number
  throughput: number
  errorRate: number
  uptime: number
  lastUpdated: bigint
  timestamp: bigint
  transactionCount: number
  successCount: number
}

export interface MarketMetrics {
  totalVolume: bigint
  averagePrice: number
  priceChange24h: number
  transactionCount: number
  marketCap: bigint
  timestamp: bigint
  avgPrice: number
  uniqueParticipants: number
}

export interface UserActivityMetrics {
  activeUsers: number
  newUsers: number
  returningUsers: number
  sessionDuration: number
  pageViews: number
}

// Define MetricType locally since it's not in generated types
export enum MetricType {
  Transactions = 'Transactions',
  Revenue = 'Revenue',
  Users = 'Users',
  Performance = 'Performance',
  Errors = 'Errors'
}

// =====================================================
// PDA DERIVATION
// =====================================================

/**
 * Derive dashboard account PDA
 */
export async function deriveDashboardPda(
  programId: Address,
  owner: Address,
  dashboardId: bigint
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      new TextEncoder().encode('dashboard'),
      getAddressEncoder().encode(owner),
      new Uint8Array(new BigUint64Array([dashboardId]).buffer)
    ]
  })
  return pda
}

/**
 * Derive market analytics account PDA
 */
export async function deriveMarketAnalyticsPda(
  programId: Address,
  market: string
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      new TextEncoder().encode('market_analytics'),
      new TextEncoder().encode(market)
    ]
  })
  return pda
}

// =====================================================
// METRICS AGGREGATION
// =====================================================

export class MetricsAggregator {
  /**
   * Aggregate performance metrics over time periods
   */
  static aggregatePerformanceMetrics(
    metrics: PerformanceMetrics[],
    periodSeconds: number = 3600 // Default 1 hour
  ): {
    periods: Array<{
      startTime: bigint
      endTime: bigint
      avgResponseTime: number
      totalTransactions: number
      successRate: number
      avgThroughput: number
    }>
  } {
    if (metrics.length === 0) return { periods: [] }

    // Sort by timestamp
    const sorted = [...metrics].sort((a, b) => 
      Number(a.timestamp - b.timestamp)
    )

    const periods = []
    let currentPeriodStart = sorted[0].timestamp
    let currentPeriodMetrics: PerformanceMetrics[] = []

    for (const metric of sorted) {
      if (metric.timestamp < currentPeriodStart + BigInt(periodSeconds)) {
        currentPeriodMetrics.push(metric)
      } else {
        // Process current period
        if (currentPeriodMetrics.length > 0) {
          periods.push(this.calculatePeriodStats(
            currentPeriodStart,
            currentPeriodStart + BigInt(periodSeconds),
            currentPeriodMetrics
          ))
        }
        
        // Start new period
        currentPeriodStart = metric.timestamp
        currentPeriodMetrics = [metric]
      }
    }

    // Process final period
    if (currentPeriodMetrics.length > 0) {
      periods.push(this.calculatePeriodStats(
        currentPeriodStart,
        currentPeriodStart + BigInt(periodSeconds),
        currentPeriodMetrics
      ))
    }

    return { periods }
  }

  /**
   * Calculate statistics for a time period
   */
  private static calculatePeriodStats(
    startTime: bigint,
    endTime: bigint,
    metrics: PerformanceMetrics[]
  ) {
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length
    const totalTransactions = metrics.reduce((sum, m) => sum + m.transactionCount, 0)
    const totalSuccess = metrics.reduce((sum, m) => sum + m.successCount, 0)
    const successRate = totalTransactions > 0 ? (totalSuccess / totalTransactions) * 100 : 0
    const avgThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length

    return {
      startTime,
      endTime,
      avgResponseTime: Math.round(avgResponseTime),
      totalTransactions,
      successRate: Math.round(successRate * 100) / 100,
      avgThroughput: Math.round(avgThroughput * 100) / 100
    }
  }

  /**
   * Calculate moving averages
   */
  static calculateMovingAverages(
    values: number[],
    windowSizes: number[] = [7, 14, 30]
  ): Map<number, number[]> {
    const results = new Map<number, number[]>()

    for (const windowSize of windowSizes) {
      const movingAverages: number[] = []
      
      for (let i = 0; i < values.length; i++) {
        if (i < windowSize - 1) {
          movingAverages.push(values[i]) // Not enough data points yet
        } else {
          const window = values.slice(i - windowSize + 1, i + 1)
          const avg = window.reduce((sum, val) => sum + val, 0) / windowSize
          movingAverages.push(avg)
        }
      }
      
      results.set(windowSize, movingAverages)
    }

    return results
  }

  /**
   * Detect anomalies using standard deviation
   */
  static detectAnomalies(
    values: number[],
    threshold: number = 2 // Number of standard deviations
  ): {
    anomalies: Array<{ index: number; value: number; deviation: number }>
    stats: { mean: number; stdDev: number }
  } {
    if (values.length === 0) {
      return { anomalies: [], stats: { mean: 0, stdDev: 0 } }
    }

    // Calculate mean
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length

    // Calculate standard deviation
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length
    const stdDev = Math.sqrt(variance)

    // Find anomalies
    const anomalies: Array<{ index: number; value: number; deviation: number }> = []
    
    values.forEach((value, index) => {
      const deviation = Math.abs(value - mean) / stdDev
      if (deviation > threshold) {
        anomalies.push({ index, value, deviation })
      }
    })

    return {
      anomalies,
      stats: { mean, stdDev }
    }
  }
}

// =====================================================
// MARKET INTELLIGENCE
// =====================================================

export class MarketIntelligence {
  /**
   * Calculate market trends
   */
  static calculateMarketTrends(
    metrics: MarketMetrics[]
  ): {
    priceDirection: 'up' | 'down' | 'stable'
    volumeDirection: 'up' | 'down' | 'stable'
    volatility: number
    momentum: number
  } {
    if (metrics.length < 2) {
      return {
        priceDirection: 'stable',
        volumeDirection: 'stable',
        volatility: 0,
        momentum: 0
      }
    }

    // Sort by timestamp
    const sorted = [...metrics].sort((a, b) => Number(a.timestamp - b.timestamp))
    
    // Calculate price direction
    const firstPrice = sorted[0].avgPrice
    const lastPrice = sorted[sorted.length - 1].avgPrice
    const priceChange = ((Number(lastPrice) - Number(firstPrice)) / Number(firstPrice)) * 100
    
    const priceDirection = priceChange > 1 ? 'up' : priceChange < -1 ? 'down' : 'stable'

    // Calculate volume direction
    const firstVolume = sorted[0].totalVolume
    const lastVolume = sorted[sorted.length - 1].totalVolume
    const volumeChange = ((Number(lastVolume) - Number(firstVolume)) / Number(firstVolume)) * 100
    
    const volumeDirection = volumeChange > 10 ? 'up' : volumeChange < -10 ? 'down' : 'stable'

    // Calculate volatility (standard deviation of price changes)
    const priceChanges: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      const change = (Number(sorted[i].avgPrice) - Number(sorted[i-1].avgPrice)) / Number(sorted[i-1].avgPrice)
      priceChanges.push(change)
    }
    
    const volatility = this.calculateStandardDeviation(priceChanges)

    // Calculate momentum (rate of change)
    const recentMetrics = sorted.slice(-5) // Last 5 data points
    const momentum = recentMetrics.length >= 2
      ? (Number(recentMetrics[recentMetrics.length - 1].avgPrice) - Number(recentMetrics[0].avgPrice)) / Number(recentMetrics[0].avgPrice)
      : 0

    return {
      priceDirection,
      volumeDirection,
      volatility: Math.round(volatility * 10000) / 100, // As percentage
      momentum: Math.round(momentum * 10000) / 100 // As percentage
    }
  }

  /**
   * Calculate market health score
   */
  static calculateMarketHealth(
    metrics: MarketMetrics,
    historicalMetrics: MarketMetrics[]
  ): {
    healthScore: number // 0-100
    factors: {
      liquidity: number
      stability: number
      growth: number
      participation: number
    }
  } {
    // Liquidity factor (based on volume)
    const avgHistoricalVolume = historicalMetrics.length > 0
      ? Number(historicalMetrics.reduce((sum, m) => sum + Number(m.totalVolume), 0)) / historicalMetrics.length
      : Number(metrics.totalVolume)
    
    const liquidityScore = Math.min(100, (Number(metrics.totalVolume) / avgHistoricalVolume) * 50)

    // Stability factor (based on price volatility)
    const priceChanges = historicalMetrics.map((m, i) => 
      i > 0 ? (Number(m.avgPrice) - Number(historicalMetrics[i-1].avgPrice)) / Number(historicalMetrics[i-1].avgPrice) : 0
    )
    const volatility = this.calculateStandardDeviation(priceChanges)
    const stabilityScore = Math.max(0, 100 - (volatility * 1000)) // Lower volatility = higher score

    // Growth factor
    const growthRate = historicalMetrics.length > 0
      ? (Number(metrics.totalVolume) - Number(historicalMetrics[0].totalVolume)) / Number(historicalMetrics[0].totalVolume)
      : 0
    const growthScore = Math.min(100, Math.max(0, (growthRate + 1) * 50))

    // Participation factor (based on unique participants)
    const participationGrowth = historicalMetrics.length > 0
      ? (Number(metrics.uniqueParticipants) - Number(historicalMetrics[0].uniqueParticipants)) / Number(historicalMetrics[0].uniqueParticipants)
      : 0
    const participationScore = Math.min(100, Math.max(0, (participationGrowth + 1) * 50))

    // Calculate overall health score
    const healthScore = (liquidityScore * 0.3 + stabilityScore * 0.3 + growthScore * 0.2 + participationScore * 0.2)

    return {
      healthScore: Math.round(healthScore),
      factors: {
        liquidity: Math.round(liquidityScore),
        stability: Math.round(stabilityScore),
        growth: Math.round(growthScore),
        participation: Math.round(participationScore)
      }
    }
  }

  /**
   * Calculate standard deviation
   */
  private static calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length
    
    return Math.sqrt(variance)
  }

  /**
   * Generate market insights
   */
  static generateMarketInsights(
    current: MarketMetrics,
    historical: MarketMetrics[]
  ): string[] {
    const insights: string[] = []
    const trends = this.calculateMarketTrends([...historical, current])
    const health = this.calculateMarketHealth(current, historical)

    // Price insights
    if (trends.priceDirection === 'up' && trends.momentum > 5) {
      insights.push(`📈 Strong upward price momentum (+${trends.momentum.toFixed(1)}%)`)
    } else if (trends.priceDirection === 'down' && trends.momentum < -5) {
      insights.push(`📉 Significant price decline (${trends.momentum.toFixed(1)}%)`)
    }

    // Volume insights
    if (trends.volumeDirection === 'up') {
      insights.push('📊 Trading volume is increasing')
    } else if (trends.volumeDirection === 'down') {
      insights.push('📊 Trading volume is decreasing')
    }

    // Volatility insights
    if (trends.volatility > 10) {
      insights.push(`⚡ High market volatility (${trends.volatility.toFixed(1)}%)`)
    } else if (trends.volatility < 2) {
      insights.push('😌 Market is relatively stable')
    }

    // Health insights
    if (health.healthScore > 80) {
      insights.push('💚 Excellent market health')
    } else if (health.healthScore < 40) {
      insights.push('🟡 Market health needs attention')
    }

    // Specific factor insights
    if (health.factors.liquidity > 80) {
      insights.push('💧 High liquidity levels')
    }
    if (health.factors.participation > 70) {
      insights.push('👥 Strong user participation')
    }

    return insights
  }
}

// =====================================================
// REPORTING UTILITIES
// =====================================================

export class ReportingUtils {
  /**
   * Generate performance report
   */
  static generatePerformanceReport(
    metrics: PerformanceMetrics[],
    period: { start: bigint; end: bigint }
  ): {
    summary: {
      totalTransactions: number
      successRate: number
      avgResponseTime: number
      peakThroughput: number
      uptime: number
    }
    details: string
  } {
    const relevantMetrics = metrics.filter(m => 
      m.timestamp >= period.start && m.timestamp <= period.end
    )

    if (relevantMetrics.length === 0) {
      return {
        summary: {
          totalTransactions: 0,
          successRate: 0,
          avgResponseTime: 0,
          peakThroughput: 0,
          uptime: 0
        },
        details: 'No data available for the specified period'
      }
    }

    const totalTransactions = relevantMetrics.reduce((sum, m) => sum + m.transactionCount, 0)
    const totalSuccess = relevantMetrics.reduce((sum, m) => sum + m.successCount, 0)
    const successRate = totalTransactions > 0 ? (totalSuccess / totalTransactions) * 100 : 0
    const avgResponseTime = relevantMetrics.reduce((sum, m) => sum + m.responseTime, 0) / relevantMetrics.length
    const peakThroughput = Math.max(...relevantMetrics.map(m => m.throughput))
    
    // Calculate uptime (percentage of time with successful transactions)
    const totalPeriods = relevantMetrics.length
    const successfulPeriods = relevantMetrics.filter(m => m.successCount > 0).length
    const uptime = totalPeriods > 0 ? (successfulPeriods / totalPeriods) * 100 : 0

    const details = `
Performance Report
Period: ${new Date(Number(period.start) * 1000).toISOString()} to ${new Date(Number(period.end) * 1000).toISOString()}

Summary:
- Total Transactions: ${totalTransactions.toLocaleString()}
- Success Rate: ${successRate.toFixed(2)}%
- Average Response Time: ${avgResponseTime.toFixed(0)}ms
- Peak Throughput: ${peakThroughput.toFixed(2)} TPS
- Uptime: ${uptime.toFixed(2)}%

Hourly Breakdown Available
    `.trim()

    return {
      summary: {
        totalTransactions,
        successRate: Math.round(successRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime),
        peakThroughput: Math.round(peakThroughput * 100) / 100,
        uptime: Math.round(uptime * 100) / 100
      },
      details
    }
  }

  /**
   * Generate CSV data for export
   */
  static generateCSV<T extends Record<string, any>>(
    data: T[],
    columns: Array<{ key: keyof T; label: string }>
  ): string {
    if (data.length === 0) return ''

    // Header row
    const headers = columns.map(col => col.label).join(',')
    
    // Data rows
    const rows = data.map(item => 
      columns.map(col => {
        const value = item[col.key]
        // Handle different types
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"` // Quote strings with commas
        }
        if (typeof value === 'bigint') {
          return value.toString()
        }
        return value?.toString() || ''
      }).join(',')
    )

    return [headers, ...rows].join('\n')
  }

  /**
   * Format report based on type
   */
  static formatReport(
    reportType: ReportType,
    data: any
  ): string {
    switch (reportType) {
      case ReportType.SecurityIncidents:
        return this.formatPerformanceReport(data)
      case ReportType.FinancialTransactions:
        return this.formatFinancialReport(data)
      case ReportType.RegulatoryCompliance:
        return this.formatComplianceReport(data)
      case ReportType.AuditSummary:
        return this.formatExecutiveReport(data)
      default:
        return JSON.stringify(data, null, 2)
    }
  }

  private static formatPerformanceReport(data: any): string {
    return `
PERFORMANCE REPORT
==================

${JSON.stringify(data, null, 2)}
    `.trim()
  }

  private static formatFinancialReport(data: any): string {
    return `
FINANCIAL REPORT
================

${JSON.stringify(data, null, 2)}
    `.trim()
  }

  private static formatComplianceReport(data: any): string {
    return `
COMPLIANCE REPORT
=================

${JSON.stringify(data, null, 2)}
    `.trim()
  }

  private static formatExecutiveReport(data: any): string {
    return `
EXECUTIVE SUMMARY
=================

${JSON.stringify(data, null, 2)}
    `.trim()
  }
}

// =====================================================
// DASHBOARD UTILITIES
// =====================================================

export class DashboardUtils {
  /**
   * Calculate dashboard metrics refresh rate
   */
  static calculateOptimalRefreshRate(
    dataVolatility: number, // 0-1
    userActivity: number, // requests per minute
    resourceConstraints: boolean
  ): number {
    // Base refresh rate in seconds
    let refreshRate = 60

    // Adjust based on volatility
    if (dataVolatility > 0.8) {
      refreshRate = 10 // High volatility = frequent updates
    } else if (dataVolatility > 0.5) {
      refreshRate = 30
    }

    // Adjust based on user activity
    if (userActivity > 100) {
      refreshRate = Math.min(refreshRate, 15)
    }

    // Apply resource constraints
    if (resourceConstraints) {
      refreshRate = Math.max(refreshRate * 2, 60)
    }

    return refreshRate
  }

  /**
   * Generate dashboard layout configuration
   */
  static generateLayoutConfig(
    widgets: Array<{ type: string; priority: number; size: 'small' | 'medium' | 'large' }>
  ): {
    grid: Array<{ widget: string; position: { x: number; y: number; w: number; h: number } }>
  } {
    const grid: Array<{ widget: string; position: { x: number; y: number; w: number; h: number } }> = []
    
    // Sort by priority
    const sorted = [...widgets].sort((a, b) => b.priority - a.priority)
    
    let currentX = 0
    let currentY = 0
    const maxWidth = 12 // Standard 12-column grid

    for (const widget of sorted) {
      const width = widget.size === 'large' ? 12 : widget.size === 'medium' ? 6 : 3
      const height = widget.size === 'large' ? 3 : widget.size === 'medium' ? 2 : 1
      
      // Check if widget fits in current row
      if (currentX + width > maxWidth) {
        currentX = 0
        currentY += 1
      }
      
      grid.push({
        widget: widget.type,
        position: { x: currentX, y: currentY, w: width, h: height }
      })
      
      currentX += width
    }

    return { grid }
  }
}

// =====================================================
// METRIC TYPE UTILITIES
// =====================================================

export class MetricTypeUtils {
  /**
   * Get metric type display name
   */
  static getDisplayName(metricType: MetricType): string {
    switch (metricType) {
      case MetricType.Transactions:
        return 'Transactions'
      case MetricType.Revenue:
        return 'Revenue'
      case MetricType.Users:
        return 'Active Users'
      case MetricType.Performance:
        return 'Performance'
      case MetricType.Errors:
        return 'Errors'
      default:
        return 'Unknown'
    }
  }

  /**
   * Get metric unit
   */
  static getUnit(metricType: MetricType): string {
    switch (metricType) {
      case MetricType.Transactions:
        return 'txns'
      case MetricType.Revenue:
        return '$'
      case MetricType.Users:
        return 'users'
      case MetricType.Performance:
        return 'ms'
      case MetricType.Errors:
        return 'errors'
      default:
        return ''
    }
  }

  /**
   * Format metric value
   */
  static formatValue(value: number | bigint, metricType: MetricType): string {
    const numValue = typeof value === 'bigint' ? Number(value) : value

    switch (metricType) {
      case MetricType.Revenue:
        return `$${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      case MetricType.Performance:
        return `${numValue.toFixed(0)}ms`
      default:
        return numValue.toLocaleString()
    }
  }
}