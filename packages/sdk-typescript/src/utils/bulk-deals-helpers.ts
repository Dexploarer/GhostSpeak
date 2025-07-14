/**
 * Bulk Deals Helper Utilities
 * 
 * Comprehensive utilities for volume-based pricing, batch execution,
 * deal lifecycle management, and enterprise pricing strategies.
 */

import type { Address } from '@solana/kit'
import { getAddressEncoder, getProgramDerivedAddress } from '@solana/kit'
import {
  DealType,
  type BulkDeal,
  type VolumeTier
} from '../generated/index.js'

// Define types locally since they're not in generated types
export enum DealStatus {
  Active = 'Active',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  Expired = 'Expired'
}

export interface DealMetrics {
  dealId: bigint
  totalExecuted: bigint
  averageExecutionTime: bigint
  successRate: number
  costSavings: bigint
  tierUtilization: Array<{ tier: number, usage: number }>
  lastUpdated: bigint
  totalVolume: number
  executedVolume: number
  totalDeliveries: number
  onTimeDeliveries: number
  customerRating: number
}

// =====================================================
// PDA DERIVATION
// =====================================================

/**
 * Derive bulk deal account PDA
 */
export async function deriveBulkDealPda(
  programId: Address,
  customer: Address,
  dealId: bigint
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      new TextEncoder().encode('bulk_deal'),
      getAddressEncoder().encode(customer),
      new Uint8Array(new BigUint64Array([dealId]).buffer)
    ]
  })
  return pda
}

/**
 * Derive deal metrics account PDA
 */
export async function deriveDealMetricsPda(
  programId: Address,
  bulkDeal: Address
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: programId,
    seeds: [
      new TextEncoder().encode('deal_metrics'),
      getAddressEncoder().encode(bulkDeal)
    ]
  })
  return pda
}

// =====================================================
// PRICING CALCULATIONS
// =====================================================

export class PricingUtils {
  /**
   * Calculate price with volume discount
   */
  static calculateDiscountedPrice(
    basePrice: bigint,
    volume: number,
    tiers: VolumeTier[]
  ): {
    finalPrice: bigint
    discount: number
    tier: VolumeTier | null
  } {
    // Find applicable tier
    const applicableTier = this.findApplicableTier(volume, tiers)
    
    if (!applicableTier) {
      return {
        finalPrice: basePrice,
        discount: 0,
        tier: null
      }
    }

    // Calculate discounted price
    const discountAmount = (basePrice * BigInt(applicableTier.discountPercentage)) / 100n
    const finalPrice = basePrice - discountAmount

    return {
      finalPrice,
      discount: applicableTier.discountPercentage,
      tier: applicableTier
    }
  }

  /**
   * Find the best applicable volume tier
   */
  static findApplicableTier(volume: number, tiers: VolumeTier[]): VolumeTier | null {
    // Sort tiers by minimum quantity descending
    const sortedTiers = [...tiers].sort((a, b) => b.minQuantity - a.minQuantity)
    
    // Find the highest tier that applies
    for (const tier of sortedTiers) {
      if (volume >= tier.minQuantity && volume <= tier.maxQuantity) {
        return tier
      }
    }
    
    return null
  }

  /**
   * Calculate total savings from bulk discount
   */
  static calculateTotalSavings(
    unitPrice: bigint,
    volume: number,
    discountPercentage: number
  ): bigint {
    const totalWithoutDiscount = unitPrice * BigInt(volume)
    const discountAmount = (totalWithoutDiscount * BigInt(discountPercentage)) / 100n
    return discountAmount
  }

  /**
   * Generate pricing table for all tiers
   */
  static generatePricingTable(
    basePrice: bigint,
    tiers: VolumeTier[]
  ): Array<{
    tier: VolumeTier
    unitPrice: bigint
    savings: bigint
    savingsPercentage: number
  }> {
    return tiers.map(tier => {
      const discountAmount = (basePrice * BigInt(tier.discountPercentage)) / 100n
      const unitPrice = basePrice - discountAmount
      
      return {
        tier,
        unitPrice,
        savings: discountAmount,
        savingsPercentage: tier.discountPercentage
      }
    })
  }

  /**
   * Validate volume tiers configuration
   */
  static validateTiers(tiers: VolumeTier[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (tiers.length === 0) {
      errors.push('At least one volume tier is required')
    }

    // Check for overlapping tiers
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i]
      
      // Validate individual tier
      if (tier.minQuantity < 0) {
        errors.push(`Tier ${i + 1}: Minimum quantity cannot be negative`)
      }
      
      if (tier.maxQuantity < tier.minQuantity) {
        errors.push(`Tier ${i + 1}: Maximum quantity must be >= minimum quantity`)
      }
      
      if (tier.discountPercentage < 0 || tier.discountPercentage > 100) {
        errors.push(`Tier ${i + 1}: Discount percentage must be between 0 and 100`)
      }

      // Check for overlaps with other tiers
      for (let j = i + 1; j < tiers.length; j++) {
        const otherTier = tiers[j]
        if (this.tiersOverlap(tier, otherTier)) {
          errors.push(`Tiers ${i + 1} and ${j + 1} have overlapping volume ranges`)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Check if two tiers overlap
   */
  private static tiersOverlap(a: VolumeTier, b: VolumeTier): boolean {
    return !(a.maxQuantity < b.minQuantity || b.maxQuantity < a.minQuantity)
  }
}

// =====================================================
// BATCH EXECUTION UTILITIES
// =====================================================

export class BatchExecutionUtils {
  /**
   * Calculate optimal batch size based on constraints
   */
  static calculateOptimalBatchSize(
    totalItems: number,
    maxBatchSize: number = 100,
    maxTransactionSize: number = 1232 // Solana transaction size limit
  ): number {
    // Estimate bytes per item (rough estimate)
    const bytesPerItem = 100
    const maxItemsBySize = Math.floor(maxTransactionSize / bytesPerItem)
    
    return Math.min(totalItems, maxBatchSize, maxItemsBySize)
  }

  /**
   * Split items into batches
   */
  static createBatches<T>(
    items: T[],
    batchSize: number
  ): T[][] {
    const batches: T[][] = []
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    
    return batches
  }

  /**
   * Calculate batch execution progress
   */
  static calculateProgress(
    completedBatches: number,
    totalBatches: number,
    currentBatchProgress: number = 0
  ): {
    percentage: number
    estimatedTimeRemaining: number
    batchesRemaining: number
  } {
    const overallProgress = (completedBatches + currentBatchProgress) / totalBatches
    const percentage = Math.round(overallProgress * 100)
    const batchesRemaining = totalBatches - completedBatches
    
    // Estimate time based on average batch processing time
    const avgBatchTime = 5 // seconds (configurable)
    const estimatedTimeRemaining = batchesRemaining * avgBatchTime
    
    return {
      percentage,
      estimatedTimeRemaining,
      batchesRemaining
    }
  }

  /**
   * Generate batch execution plan
   */
  static generateExecutionPlan(
    totalVolume: number,
    batchSize: number,
    startTime: bigint
  ): {
    totalBatches: number
    batches: Array<{
      batchNumber: number
      startIndex: number
      endIndex: number
      size: number
      estimatedStartTime: bigint
    }>
  } {
    const totalBatches = Math.ceil(totalVolume / batchSize)
    const batches = []
    
    for (let i = 0; i < totalBatches; i++) {
      const startIndex = i * batchSize
      const endIndex = Math.min(startIndex + batchSize - 1, totalVolume - 1)
      const size = endIndex - startIndex + 1
      const estimatedStartTime = startTime + BigInt(i * 5) // 5 seconds per batch
      
      batches.push({
        batchNumber: i + 1,
        startIndex,
        endIndex,
        size,
        estimatedStartTime
      })
    }
    
    return { totalBatches, batches }
  }
}

// =====================================================
// DEAL LIFECYCLE MANAGEMENT
// =====================================================

export class DealLifecycleUtils {
  /**
   * Check if deal is active
   */
  static isActive(deal: BulkDeal): boolean {
    const now = BigInt(Math.floor(Date.now() / 1000))
    return deal.isActive &&
           now >= deal.startDate &&
           now <= deal.endDate
  }

  /**
   * Check if deal has expired
   */
  static hasExpired(deal: BulkDeal): boolean {
    const now = BigInt(Math.floor(Date.now() / 1000))
    return now > deal.endDate
  }

  /**
   * Calculate deal progress
   */
  static calculateProgress(deal: BulkDeal): {
    volumeProgress: number
    timeProgress: number
    onTrack: boolean
  } {
    // Volume progress
    const volumeProgress = (Number(deal.executedVolume) / Number(deal.totalVolume)) * 100
    
    // Time progress
    const now = BigInt(Math.floor(Date.now() / 1000))
    const totalDuration = deal.endDate - deal.startDate
    const elapsed = now - deal.startDate
    const timeProgress = totalDuration > 0n 
      ? Number((elapsed * 100n) / totalDuration)
      : 0
    
    // Check if on track (volume progress should match time progress)
    const onTrack = volumeProgress >= timeProgress * 0.9 // 10% buffer
    
    return {
      volumeProgress: Math.round(volumeProgress),
      timeProgress: Math.round(timeProgress),
      onTrack
    }
  }

  /**
   * Calculate remaining commitment
   */
  static calculateRemainingCommitment(deal: BulkDeal): {
    remainingVolume: number
    remainingValue: bigint
    daysRemaining: number
  } {
    const remainingVolume = Number(deal.totalVolume) - Number(deal.executedVolume)
    const remainingValue = deal.totalValue
    
    const now = BigInt(Math.floor(Date.now() / 1000))
    const secondsRemaining = deal.endDate > now ? deal.endDate - now : 0n
    const daysRemaining = Math.ceil(Number(secondsRemaining) / 86400)
    
    return {
      remainingVolume,
      remainingValue,
      daysRemaining
    }
  }

  /**
   * Generate deal status summary
   */
  static generateStatusSummary(deal: BulkDeal): string {
    const progress = this.calculateProgress(deal)
    const remaining = this.calculateRemainingCommitment(deal)
    
    const lines = [
      `Deal Status: ${deal.isActive ? 'Active' : 'Inactive'}`,
      `Volume Progress: ${progress.volumeProgress}% (${deal.executedVolume}/${deal.totalVolume})`,
      `Time Progress: ${progress.timeProgress}%`,
      `On Track: ${progress.onTrack ? '✅ Yes' : '⚠️ No'}`,
      `Days Remaining: ${remaining.daysRemaining}`,
      `Remaining Volume: ${remaining.remainingVolume}`
    ]
    
    return lines.join('\n')
  }

  /**
   * Validate deal can be executed
   */
  static validateExecution(
    deal: BulkDeal,
    requestedVolume: number
  ): { valid: boolean; error?: string } {
    if (!this.isActive(deal)) {
      return { valid: false, error: 'Deal is not active' }
    }

    if (this.hasExpired(deal)) {
      return { valid: false, error: 'Deal has expired' }
    }

    const remaining = Number(deal.totalVolume) - Number(deal.executedVolume)
    if (requestedVolume > remaining) {
      return { valid: false, error: `Requested volume (${requestedVolume}) exceeds remaining (${remaining})` }
    }

    return { valid: true }
  }
}

// =====================================================
// DEAL ANALYTICS
// =====================================================

export interface DealAnalytics {
  totalDeals: number
  activeDeals: number
  completedDeals: number
  totalVolume: number
  totalValue: bigint
  averageDiscount: number
  topCustomers: Array<{ customer: Address; dealCount: number; totalVolume: number }>
  popularTiers: Array<{ tier: VolumeTier; usageCount: number }>
}

export class DealAnalyticsUtils {
  /**
   * Calculate deal performance score
   */
  static calculatePerformanceScore(metrics: DealMetrics): number {
    let score = 0
    
    // Completion rate (40 points)
    const completionRate = metrics.totalVolume > 0
      ? metrics.executedVolume / metrics.totalVolume
      : 0
    score += Math.min(completionRate * 40, 40)
    
    // On-time delivery (30 points)
    const onTimeRate = metrics.totalDeliveries > 0
      ? metrics.onTimeDeliveries / metrics.totalDeliveries
      : 0
    score += onTimeRate * 30
    
    // Customer satisfaction (30 points)
    const satisfactionRate = metrics.customerRating / 5
    score += satisfactionRate * 30
    
    return Math.round(score)
  }

  /**
   * Generate analytics summary
   */
  static generateAnalyticsSummary(analytics: DealAnalytics): string {
    const avgVolumePerDeal = analytics.totalDeals > 0
      ? Math.round(analytics.totalVolume / analytics.totalDeals)
      : 0
    
    const avgValuePerDeal = analytics.totalDeals > 0
      ? analytics.totalValue / BigInt(analytics.totalDeals)
      : 0n
    
    return `
Bulk Deals Analytics:
- Total Deals: ${analytics.totalDeals}
- Active: ${analytics.activeDeals}
- Completed: ${analytics.completedDeals}
- Total Volume: ${analytics.totalVolume.toLocaleString()}
- Average Volume/Deal: ${avgVolumePerDeal.toLocaleString()}
- Average Discount: ${analytics.averageDiscount.toFixed(1)}%
- Top Customer: ${analytics.topCustomers[0]?.customer || 'N/A'}
    `.trim()
  }

  /**
   * Calculate ROI for bulk deal program
   */
  static calculateROI(
    totalRevenue: bigint,
    totalDiscounts: bigint,
    operationalCosts: bigint
  ): {
    roi: number
    netRevenue: bigint
    discountImpact: number
  } {
    const netRevenue = totalRevenue - totalDiscounts - operationalCosts
    const roi = operationalCosts > 0n
      ? Number((netRevenue * 100n) / operationalCosts)
      : 0
    
    const discountImpact = totalRevenue > 0n
      ? Number((totalDiscounts * 100n) / totalRevenue)
      : 0
    
    return {
      roi,
      netRevenue,
      discountImpact
    }
  }
}

// =====================================================
// VOLUME TIER TEMPLATES
// =====================================================

export const VOLUME_TIER_TEMPLATES = {
  STANDARD: [
    { minQuantity: 10, maxQuantity: 49, discountPercentage: 5 },
    { minQuantity: 50, maxQuantity: 99, discountPercentage: 10 },
    { minQuantity: 100, maxQuantity: 499, discountPercentage: 15 },
    { minQuantity: 500, maxQuantity: 999, discountPercentage: 20 },
    { minQuantity: 1000, maxQuantity: 999999, discountPercentage: 25 }
  ],
  
  ENTERPRISE: [
    { minQuantity: 100, maxQuantity: 999, discountPercentage: 15 },
    { minQuantity: 1000, maxQuantity: 4999, discountPercentage: 25 },
    { minQuantity: 5000, maxQuantity: 9999, discountPercentage: 35 },
    { minQuantity: 10000, maxQuantity: 999999, discountPercentage: 40 }
  ],
  
  STARTUP: [
    { minQuantity: 5, maxQuantity: 19, discountPercentage: 10 },
    { minQuantity: 20, maxQuantity: 49, discountPercentage: 20 },
    { minQuantity: 50, maxQuantity: 99, discountPercentage: 30 },
    { minQuantity: 100, maxQuantity: 999999, discountPercentage: 35 }
  ]
}

// =====================================================
// DEAL TYPE UTILITIES
// =====================================================

export class DealTypeUtils {
  /**
   * Get deal type display name
   */
  static getDisplayName(dealType: DealType): string {
    switch (dealType) {
      case DealType.VolumeDiscount:
        return 'Volume Discount'
      case DealType.BundleOffer:
        return 'Bundle Offer'
      case DealType.GroupPurchase:
        return 'Group Purchase'
      case DealType.Wholesale:
        return 'Wholesale'
      default:
        return 'Unknown'
    }
  }

  /**
   * Get recommended tiers for deal type
   */
  static getRecommendedTiers(dealType: DealType): VolumeTier[] {
    switch (dealType) {
      case DealType.Wholesale:
        return VOLUME_TIER_TEMPLATES.ENTERPRISE
      case DealType.VolumeDiscount:
        return VOLUME_TIER_TEMPLATES.STANDARD
      default:
        return VOLUME_TIER_TEMPLATES.STANDARD
    }
  }
}