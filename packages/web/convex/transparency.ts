/**
 * GhostSpeak Revenue-Share Staking Transparency
 *
 * Real-time metrics for protocol revenue, staking stats, and APY calculations
 */

import { query } from './_generated/server'
import { v } from 'convex/values'

/**
 * Get protocol-wide revenue metrics
 *
 * Returns revenue data for this month, last month, and all-time
 * Includes breakdown of revenue sources (B2C, B2B, overages)
 */
export const getProtocolMetrics = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const thisMonthStart = new Date()
    thisMonthStart.setDate(1)
    thisMonthStart.setHours(0, 0, 0, 0)

    const lastMonthStart = new Date(thisMonthStart)
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)

    const lastMonthEnd = new Date(thisMonthStart)
    lastMonthEnd.setTime(lastMonthEnd.getTime() - 1)

    // Get B2C revenue (pay-per-check verifications)
    const thisMonthVerifications = await ctx.db
      .query('verifications')
      .filter((q) => q.gte(q.field('timestamp'), thisMonthStart.getTime()))
      .collect()

    const lastMonthVerifications = await ctx.db
      .query('verifications')
      .filter((q) =>
        q.and(
          q.gte(q.field('timestamp'), lastMonthStart.getTime()),
          q.lte(q.field('timestamp'), lastMonthEnd.getTime())
        )
      )
      .collect()

    const allVerifications = await ctx.db.query('verifications').collect()

    // Calculate revenue from verifications
    // Paid verifications: 1 USDC per check, 10% to staker pool (0.1 USDC)
    const thisMonthB2CRevenue = thisMonthVerifications.filter(
      (v) => v.paymentMethod === 'usdc' || v.paymentMethod === 'ghost_burned'
    ).length

    const lastMonthB2CRevenue = lastMonthVerifications.filter(
      (v) => v.paymentMethod === 'usdc' || v.paymentMethod === 'ghost_burned'
    ).length

    const allTimeB2CRevenue = allVerifications.filter(
      (v) => v.paymentMethod === 'usdc' || v.paymentMethod === 'ghost_burned'
    ).length

    // Get B2B revenue (API usage)
    const thisMonthApiUsage = await ctx.db
      .query('apiUsage')
      .withIndex('by_timestamp', (q) => q.gte('timestamp', thisMonthStart.getTime()))
      .filter((q) => q.eq(q.field('billable'), true))
      .collect()

    const lastMonthApiUsage = await ctx.db
      .query('apiUsage')
      .withIndex('by_timestamp', (q) =>
        q.gte('timestamp', lastMonthStart.getTime()).lte('timestamp', lastMonthEnd.getTime())
      )
      .filter((q) => q.eq(q.field('billable'), true))
      .collect()

    const allApiUsage = await ctx.db
      .query('apiUsage')
      .filter((q) => q.eq(q.field('billable'), true))
      .collect()

    // Calculate B2B revenue (cost is in USD cents)
    const thisMonthB2BRevenue =
      thisMonthApiUsage.reduce((sum, usage) => sum + (usage.cost || 0), 0) / 100 // Convert cents to dollars

    const lastMonthB2BRevenue =
      lastMonthApiUsage.reduce((sum, usage) => sum + (usage.cost || 0), 0) / 100

    const allTimeB2BRevenue = allApiUsage.reduce((sum, usage) => sum + (usage.cost || 0), 0) / 100

    // Calculate total revenue
    const thisMonthTotal = thisMonthB2CRevenue + thisMonthB2BRevenue
    const lastMonthTotal = lastMonthB2CRevenue + lastMonthB2BRevenue
    const allTimeTotal = allTimeB2CRevenue + allTimeB2BRevenue

    // Calculate staker rewards pool (10% of total revenue)
    const thisMonthStakerPool = thisMonthTotal * 0.1
    const lastMonthStakerPool = lastMonthTotal * 0.1
    const allTimeStakerPool = allTimeTotal * 0.1

    // TODO: Get actual claimed/unclaimed from on-chain staking contract
    // For now, simulate with 60% claimed
    const thisMonthClaimed = thisMonthStakerPool * 0.6
    const thisMonthUnclaimed = thisMonthStakerPool * 0.4

    return {
      protocol: {
        totalRevenue: {
          thisMonth: thisMonthTotal,
          lastMonth: lastMonthTotal,
          allTime: allTimeTotal,
        },
        stakerRewardsPool: {
          thisMonth: thisMonthStakerPool,
          pending: thisMonthUnclaimed,
          distributed: thisMonthClaimed,
        },
        revenueSources: {
          b2c: {
            thisMonth: thisMonthB2CRevenue,
            lastMonth: lastMonthB2CRevenue,
            allTime: allTimeB2CRevenue,
          },
          b2b: {
            thisMonth: thisMonthB2BRevenue,
            lastMonth: lastMonthB2BRevenue,
            allTime: allTimeB2BRevenue,
          },
        },
      },
      timestamp: now,
    }
  },
})

/**
 * Get staking metrics
 *
 * Returns total staked GHOST, number of stakers, weighted stake, and tier distribution
 */
export const getStakingMetrics = query({
  args: {},
  handler: async (ctx) => {
    // TODO: Get actual staking data from on-chain contract
    // For now, return mock data for UI development
    const stakingAccounts = await ctx.db
      .query('stakingAccounts')
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect()

    const totalStaked = stakingAccounts.reduce((sum, account) => sum + account.amountStaked, 0)

    const totalStakers = stakingAccounts.length

    // Calculate weighted stake (based on reputation boost)
    const weightedStake = stakingAccounts.reduce(
      (sum, account) => sum + account.amountStaked * (1 + account.reputationBoostBps / 10000),
      0
    )

    const avgStake = totalStakers > 0 ? totalStaked / totalStakers : 0

    // Calculate tier distribution
    const tierDistribution = {
      tier1: stakingAccounts.filter((a) => a.tier === 1).length,
      tier2: stakingAccounts.filter((a) => a.tier === 2).length,
      tier3: stakingAccounts.filter((a) => a.tier === 3).length,
    }

    return {
      totalStaked,
      totalStakers,
      weightedStake,
      avgStake,
      tierDistribution,
    }
  },
})

/**
 * Get APY history
 *
 * Calculate APY for different time periods (7d, 30d, 90d, all-time)
 * APY = (Annual Rewards / Staked Value) * 100
 */
export const getAPYHistory = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()

    // Time periods
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000

    // Get revenue for each period
    const verifications7d = await ctx.db
      .query('verifications')
      .filter((q) => q.gte(q.field('timestamp'), sevenDaysAgo))
      .collect()

    const verifications30d = await ctx.db
      .query('verifications')
      .filter((q) => q.gte(q.field('timestamp'), thirtyDaysAgo))
      .collect()

    const verifications90d = await ctx.db
      .query('verifications')
      .filter((q) => q.gte(q.field('timestamp'), ninetyDaysAgo))
      .collect()

    const allVerifications = await ctx.db.query('verifications').collect()

    // Calculate revenue for each period (1 USDC per paid verification)
    const revenue7d = verifications7d.filter(
      (v) => v.paymentMethod === 'usdc' || v.paymentMethod === 'ghost_burned'
    ).length

    const revenue30d = verifications30d.filter(
      (v) => v.paymentMethod === 'usdc' || v.paymentMethod === 'ghost_burned'
    ).length

    const revenue90d = verifications90d.filter(
      (v) => v.paymentMethod === 'usdc' || v.paymentMethod === 'ghost_burned'
    ).length

    const revenueAllTime = allVerifications.filter(
      (v) => v.paymentMethod === 'usdc' || v.paymentMethod === 'ghost_burned'
    ).length

    // Staker pool = 10% of revenue
    const stakerPool7d = revenue7d * 0.1
    const stakerPool30d = revenue30d * 0.1
    const stakerPool90d = revenue90d * 0.1
    const stakerPoolAllTime = revenueAllTime * 0.1

    // TODO: Get actual staked amount and GHOST price from on-chain
    // For now, use mock values
    const totalStakedValue = 150000 // $150K TVL (example)
    const ghostPrice = 0.015 // $0.015 per GHOST

    // Calculate APY for each period (annualized)
    const calculateAPY = (poolAmount: number, days: number) => {
      if (days === 0) return 0
      const annualizedRevenue = (poolAmount / days) * 365
      return (annualizedRevenue / totalStakedValue) * 100
    }

    const apy7d = calculateAPY(stakerPool7d, 7)
    const apy30d = calculateAPY(stakerPool30d, 30)
    const apy90d = calculateAPY(stakerPool90d, 90)

    // All-time APY calculation
    const firstVerification = allVerifications[0]
    const daysSinceStart = firstVerification
      ? (now - firstVerification.timestamp) / (24 * 60 * 60 * 1000)
      : 1
    const apyAllTime = calculateAPY(stakerPoolAllTime, daysSinceStart)

    // Generate historical APY data points (last 90 days, weekly buckets)
    const historicalAPY = []
    for (let i = 12; i >= 0; i--) {
      const weekAgo = now - i * 7 * 24 * 60 * 60 * 1000
      const weekStart = weekAgo
      const weekEnd = weekAgo + 7 * 24 * 60 * 60 * 1000

      const weekVerifications = await ctx.db
        .query('verifications')
        .filter((q) =>
          q.and(q.gte(q.field('timestamp'), weekStart), q.lte(q.field('timestamp'), weekEnd))
        )
        .collect()

      const weekRevenue = weekVerifications.filter(
        (v) => v.paymentMethod === 'usdc' || v.paymentMethod === 'ghost_burned'
      ).length

      const weekStakerPool = weekRevenue * 0.1
      const weekAPY = calculateAPY(weekStakerPool, 7)

      historicalAPY.push({
        date: new Date(weekAgo).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        apy: weekAPY,
      })
    }

    return {
      current: apy30d, // Current APY is based on last 30 days
      '7day': apy7d,
      '30day': apy30d,
      '90day': apy90d,
      allTime: apyAllTime,
      historicalData: historicalAPY,
    }
  },
})

/**
 * Get user's stake details
 *
 * Returns user's staked amount, tier, multiplier, pending rewards, and estimated earnings
 */
export const getUserStakeDetails = query({
  args: {
    walletAddress: v.optional(v.string()),
  },
  handler: async (ctx, { walletAddress }) => {
    if (!walletAddress) {
      return null
    }

    // TODO: Get actual staking data from on-chain contract
    // For now, check Convex database
    const stakingAccount = await ctx.db
      .query('stakingAccounts')
      .filter((q) =>
        q.and(q.eq(q.field('agentAddress'), walletAddress), q.eq(q.field('isActive'), true))
      )
      .first()

    if (!stakingAccount) {
      return null
    }

    // Calculate tier based on amount staked
    const getTier = (amount: number): { name: string; multiplier: number } => {
      if (amount >= 500000) return { name: 'Whale Staker', multiplier: 3 }
      if (amount >= 50000) return { name: 'Pro Staker', multiplier: 2 }
      if (amount >= 5000) return { name: 'Verified Staker', multiplier: 1.5 }
      return { name: 'Basic Staker', multiplier: 1 }
    }

    const tier = getTier(stakingAccount.amountStaked)

    // Calculate weighted stake
    const weightedStake = stakingAccount.amountStaked * tier.multiplier

    // Get total weighted stake from all users
    const allStakingAccounts = await ctx.db
      .query('stakingAccounts')
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect()

    const totalWeightedStake = allStakingAccounts.reduce((sum, account) => {
      const accountTier = getTier(account.amountStaked)
      return sum + account.amountStaked * accountTier.multiplier
    }, 0)

    // Calculate share of pool
    const shareOfPool = totalWeightedStake > 0 ? (weightedStake / totalWeightedStake) * 100 : 0

    // Calculate pending rewards
    // TODO: Get from on-chain contract
    // For now, calculate a rough estimate based on this month's verifications
    const thisMonthStart = new Date()
    thisMonthStart.setDate(1)
    thisMonthStart.setHours(0, 0, 0, 0)

    const thisMonthVerifications = await ctx.db
      .query('verifications')
      .filter((q) => q.gte(q.field('timestamp'), thisMonthStart.getTime()))
      .collect()

    const thisMonthB2CRevenue = thisMonthVerifications.filter(
      (v) => v.paymentMethod === 'usdc' || v.paymentMethod === 'ghost_burned'
    ).length

    const monthlyStakerPool: number = thisMonthB2CRevenue * 0.1 // 10% to staker pool

    const pendingRewards: number = (shareOfPool / 100) * monthlyStakerPool

    // Estimate monthly earnings (based on last 30 days)
    const estimatedMonthly = pendingRewards

    // Calculate estimated APY
    const ghostPrice = 0.015 // TODO: Get from price oracle
    const stakeValue = stakingAccount.amountStaked * ghostPrice
    const annualRewards = estimatedMonthly * 12
    const estimatedAPY = stakeValue > 0 ? (annualRewards / stakeValue) * 100 : 0

    return {
      amount: stakingAccount.amountStaked,
      tier: tier.name,
      multiplier: tier.multiplier,
      weightedStake,
      shareOfPool,
      pendingRewards,
      estimatedMonthly,
      estimatedAPY,
      stakedAt: stakingAccount.stakedAt,
      unlockAt: stakingAccount.unlockAt,
    }
  },
})

/**
 * Get monthly revenue history (last 12 months)
 *
 * Returns revenue data for bar chart
 */
export const getMonthlyRevenueHistory = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const monthlyData = []

    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date()
      monthDate.setMonth(monthDate.getMonth() - i)
      monthDate.setDate(1)
      monthDate.setHours(0, 0, 0, 0)

      const monthStart = monthDate.getTime()

      const nextMonth = new Date(monthDate)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      const monthEnd = nextMonth.getTime()

      // Get verifications for this month
      const monthVerifications = await ctx.db
        .query('verifications')
        .filter((q) =>
          q.and(q.gte(q.field('timestamp'), monthStart), q.lt(q.field('timestamp'), monthEnd))
        )
        .collect()

      const monthRevenue = monthVerifications.filter(
        (v) => v.paymentMethod === 'usdc' || v.paymentMethod === 'ghost_burned'
      ).length

      monthlyData.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: monthRevenue,
        stakerPool: monthRevenue * 0.1,
      })
    }

    return monthlyData
  },
})

/**
 * Get staker count growth (last 12 months)
 *
 * Returns staker count data for area chart
 */
export const getStakerGrowth = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const growthData = []

    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date()
      monthDate.setMonth(monthDate.getMonth() - i)
      monthDate.setDate(1)
      monthDate.setHours(0, 0, 0, 0)

      const monthStart = monthDate.getTime()

      // Get staking events up to this month
      const stakingEvents = await ctx.db
        .query('stakingEvents')
        .filter((q) => q.lte(q.field('timestamp'), monthStart))
        .collect()

      // Calculate net stakers (staked - unstaked)
      const stakedCount = stakingEvents.filter((e) => e.eventType === 'staked').length
      const unstakedCount = stakingEvents.filter((e) => e.eventType === 'unstaked').length

      growthData.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        stakers: stakedCount - unstakedCount,
      })
    }

    return growthData
  },
})
