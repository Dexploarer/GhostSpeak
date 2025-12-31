'use client'

import React, { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useWalletAddress } from '@/lib/hooks/useWalletAddress'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { StatsCard } from '@/components/dashboard/shared/StatsCard'
import { ActivityChart } from '@/components/dashboard/shared/ActivityChart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DollarSign,
  TrendingUp,
  Users,
  Percent,
  Coins,
  Award,
  ArrowDownToLine,
  AlertTriangle,
  BarChart3,
  PieChart,
  LineChart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart as RechartsLine,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart as RechartsBar,
  Bar,
} from 'recharts'

// Utility function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Utility function to format numbers
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(num)
}

// Utility function to format percentages
const formatPercent = (num: number) => {
  return `${num.toFixed(2)}%`
}

// Colors for charts
const CHART_COLORS = {
  primary: '#8b5cf6',
  secondary: '#06b6d4',
  tertiary: '#f59e0b',
  success: '#10b981',
  danger: '#ef4444',
}

const TIER_COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b']

export default function TransparencyDashboard() {
  const { address, isConnected } = useWalletAddress()

  // Fetch data from Convex
  const protocolMetrics = useQuery(api.transparency.getProtocolMetrics, {})
  const stakingMetrics = useQuery(api.transparency.getStakingMetrics, {})
  const apyHistory = useQuery(api.transparency.getAPYHistory, {})
  const userStake = useQuery(api.transparency.getUserStakeDetails, {
    walletAddress: address || undefined,
  })
  const monthlyRevenue = useQuery(api.transparency.getMonthlyRevenueHistory, {})
  const stakerGrowth = useQuery(api.transparency.getStakerGrowth, {})

  const isLoading =
    protocolMetrics === undefined ||
    stakingMetrics === undefined ||
    apyHistory === undefined ||
    monthlyRevenue === undefined ||
    stakerGrowth === undefined

  // Prepare tier distribution data for pie chart
  const tierDistributionData = useMemo(() => {
    if (!stakingMetrics) return []
    return [
      { name: 'Basic Staker', value: stakingMetrics.tierDistribution.tier1 },
      { name: 'Verified Staker', value: stakingMetrics.tierDistribution.tier2 },
      { name: 'Pro Staker', value: stakingMetrics.tierDistribution.tier3 },
    ]
  }, [stakingMetrics])

  // Prepare revenue sources data for pie chart
  const revenueSourcesData = useMemo(() => {
    if (!protocolMetrics) return []
    return [
      { name: 'B2C Fees', value: protocolMetrics.protocol.revenueSources.b2c.thisMonth },
      { name: 'B2B Fees', value: protocolMetrics.protocol.revenueSources.b2b.thisMonth },
    ]
  }, [protocolMetrics])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-linear-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Revenue-Share Transparency
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time metrics for protocol revenue, staking stats, and APY calculations
          </p>
        </div>

        {/* APY Disclaimer */}
        <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-sm text-muted-foreground">
            <strong className="text-foreground">APY Disclaimer:</strong> APY is calculated from
            actual protocol revenue and varies monthly. This is not a guaranteed return. APY may be
            0% in months with no revenue. Past performance does not guarantee future results.
          </AlertDescription>
        </Alert>
      </div>

      {/* Protocol Metrics Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-primary" />
          Protocol Revenue
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <StatsCard
                label="This Month"
                value={formatCurrency(protocolMetrics!.protocol.totalRevenue.thisMonth)}
                trend="Current"
                trendUp={true}
                icon={DollarSign}
                iconColor="text-green-500"
              />
              <StatsCard
                label="Last Month"
                value={formatCurrency(protocolMetrics!.protocol.totalRevenue.lastMonth)}
                trend="Previous"
                trendUp={true}
                icon={DollarSign}
                iconColor="text-blue-500"
              />
              <StatsCard
                label="All Time"
                value={formatCurrency(protocolMetrics!.protocol.totalRevenue.allTime)}
                trend="Total"
                trendUp={true}
                icon={DollarSign}
                iconColor="text-purple-500"
              />
            </div>

            {/* Staker Rewards Pool */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Staker Rewards Pool (This Month)</CardTitle>
                  <CardDescription>10% of protocol revenue distributed to stakers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Pool:</span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(protocolMetrics!.protocol.stakerRewardsPool.thisMonth)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Unclaimed:</span>
                      <span className="text-sm font-medium text-yellow-500">
                        {formatCurrency(protocolMetrics!.protocol.stakerRewardsPool.pending)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Distributed:</span>
                      <span className="text-sm font-medium text-green-500">
                        {formatCurrency(protocolMetrics!.protocol.stakerRewardsPool.distributed)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Sources Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Revenue Sources</CardTitle>
                  <CardDescription>Breakdown of revenue by source (this month)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={revenueSourcesData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                        >
                          {revenueSourcesData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={index === 0 ? CHART_COLORS.primary : CHART_COLORS.secondary}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            border: 'none',
                            borderRadius: '8px',
                          }}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </section>

      {/* Staking Metrics Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Coins className="w-6 h-6 text-primary" />
          Staking Metrics
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <StatsCard
                label="Total Staked"
                value={formatNumber(stakingMetrics!.totalStaked)}
                unit="GHOST"
                trend="TVL"
                trendUp={true}
                icon={Coins}
                iconColor="text-purple-500"
              />
              <StatsCard
                label="Weighted Stake"
                value={formatNumber(stakingMetrics!.weightedStake)}
                unit="GHOST"
                trend="With Multipliers"
                trendUp={true}
                icon={Award}
                iconColor="text-cyan-500"
              />
              <StatsCard
                label="Total Stakers"
                value={formatNumber(stakingMetrics!.totalStakers)}
                unit="Wallets"
                trend="Active"
                trendUp={true}
                icon={Users}
                iconColor="text-green-500"
              />
              <StatsCard
                label="Avg Stake"
                value={formatNumber(stakingMetrics!.avgStake)}
                unit="GHOST"
                trend="Per Wallet"
                trendUp={true}
                icon={BarChart3}
                iconColor="text-yellow-500"
              />
            </div>

            {/* Tier Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tier Distribution</CardTitle>
                <CardDescription>Number of stakers in each tier</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={tierDistributionData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                      >
                        {tierDistributionData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={TIER_COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          border: 'none',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </section>

      {/* APY Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Percent className="w-6 h-6 text-primary" />
          APY (Annual Percentage Yield)
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current APY */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current APY</CardTitle>
                <CardDescription>Based on last 30 days of revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-6xl font-bold text-primary mb-2">
                    {formatPercent(apyHistory!.current)}
                  </div>
                  <p className="text-sm text-muted-foreground">Variable, not guaranteed</p>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">7-Day</p>
                    <p className="text-lg font-semibold">{formatPercent(apyHistory!['7day'])}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">90-Day</p>
                    <p className="text-lg font-semibold">{formatPercent(apyHistory!['90day'])}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">All-Time</p>
                    <p className="text-lg font-semibold">{formatPercent(apyHistory!.allTime)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* APY History Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">APY Over Time</CardTitle>
                <CardDescription>Historical APY (last 90 days, weekly)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLine data={apyHistory!.historicalData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: number) => formatPercent(value)}
                        contentStyle={{
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          border: 'none',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="apy"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={2}
                        dot={false}
                      />
                    </RechartsLine>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* Your Stake Section (user-specific) */}
      {isConnected && (
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            Your Stake
          </h2>

          {userStake === undefined ? (
            <Skeleton className="h-64" />
          ) : userStake === null ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">You have no active stake.</p>
                <Button>Stake GHOST Tokens</Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Staking Details</CardTitle>
                <CardDescription>Your current stake and estimated earnings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Staked Amount</p>
                      <p className="text-2xl font-bold">
                        {formatNumber(userStake.amount)} <span className="text-lg">GHOST</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Tier</p>
                      <p className="text-xl font-semibold text-primary">{userStake.tier}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Revenue Share Multiplier</p>
                      <p className="text-xl font-semibold text-cyan-500">
                        {userStake.multiplier}x
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Weighted Stake</p>
                      <p className="text-lg font-medium">
                        {formatNumber(userStake.weightedStake)} GHOST
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Share of Pool</p>
                      <p className="text-lg font-medium">{formatPercent(userStake.shareOfPool)}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-primary/10 border border-primary/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Pending Rewards</p>
                      <p className="text-3xl font-bold text-primary">
                        {formatCurrency(userStake.pendingRewards)}
                      </p>
                      <Button className="w-full mt-4" size="lg">
                        <ArrowDownToLine className="w-4 h-4 mr-2" />
                        Claim Rewards
                      </Button>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Estimated Monthly</p>
                      <p className="text-xl font-semibold">
                        {formatCurrency(userStake.estimatedMonthly)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Your Estimated APY</p>
                      <p className="text-xl font-semibold text-green-500">
                        {formatPercent(userStake.estimatedAPY)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        (includes your {userStake.multiplier}x tier multiplier)
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* Historical Charts Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <LineChart className="w-6 h-6 text-primary" />
          Historical Data
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Revenue Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Revenue</CardTitle>
                <CardDescription>Protocol revenue over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBar data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          border: 'none',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill={CHART_COLORS.primary} name="Total Revenue" />
                      <Bar
                        dataKey="stakerPool"
                        fill={CHART_COLORS.secondary}
                        name="Staker Pool (10%)"
                      />
                    </RechartsBar>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Staker Growth Area Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Staker Growth</CardTitle>
                <CardDescription>Number of active stakers over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityChart data={stakerGrowth!} type="area" height={256} color="#10b981" />
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </div>
  )
}
