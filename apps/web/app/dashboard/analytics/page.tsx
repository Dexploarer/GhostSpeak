'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from 'convex/react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Shield, Activity, Zap, TrendingUp, Filter, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { api } from '@/convex/_generated/api'
import { StatCard } from '@/components/ui/enhanced/StatCard'
import { MetricCard } from '../../../components/ui/enhanced/MetricCard'
import { GhostLoader } from '@/components/ui/enhanced/GhostLoader'

// Helper to format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString()
}

// Helper to get days from time range
function getDaysFromRange(range: string): number {
  switch (range) {
    case '24h':
      return 1
    case '7d':
      return 7
    case '30d':
      return 30
    case '90d':
      return 90
    default:
      return 7
  }
}

export default function AnalyticsPage() {
  const { publicKey } = useWallet()
  const [timeRange, setTimeRange] = useState('7d')

  const days = useMemo(() => getDaysFromRange(timeRange), [timeRange])

  // Real Convex queries
  const verificationVolume = useQuery(
    api.analytics.getVerificationVolume,
    publicKey ? { walletAddress: publicKey, days } : 'skip'
  )

  const apiEndpointUsage = useQuery(
    api.analytics.getApiEndpointUsage,
    publicKey ? { walletAddress: publicKey, days } : 'skip'
  )

  const analyticsSummary = useQuery(
    api.analytics.getAnalyticsSummary,
    publicKey ? { walletAddress: publicKey } : 'skip'
  )

  const detailedMetrics = useQuery(
    api.analytics.getDetailedMetrics,
    publicKey ? { walletAddress: publicKey } : 'skip'
  )

  const isLoading = verificationVolume === undefined || apiEndpointUsage === undefined

  // Use real data or empty arrays for charts
  const verificationData = verificationVolume?.data || []
  const apiUsageData = apiEndpointUsage?.data || []

  // Format success rate for display
  const successRateValue = analyticsSummary?.successRate ? `${analyticsSummary.successRate}%` : '—'

  // Format total requests
  const totalRequestsValue =
    analyticsSummary?.totalRequests !== undefined
      ? formatNumber(analyticsSummary.totalRequests)
      : '—'

  // Format latency
  const latencyValue =
    analyticsSummary?.avgLatency !== undefined ? `${analyticsSummary.avgLatency}ms` : '—'

  // Format gas savings
  const gasSavingsValue =
    analyticsSummary?.gasSavings !== undefined ? `$${analyticsSummary.gasSavings.toFixed(2)}` : '—'

  if (!publicKey) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Connect Wallet</h2>
          <p className="text-white/40">Connect your wallet to view analytics.</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Performance Analytics</h1>
          <p className="text-white/40 mt-1">
            Deep insights into your agent's performance and protocol activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 border border-white/10 rounded-lg p-1">
            {['24h', '7d', '30d', '90d'].map((range: any) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  timeRange === range ? 'bg-primary text-black' : 'text-white/60 hover:text-white'
                )}
              >
                {range}
              </button>
            ))}
          </div>
          <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
            <Filter className="w-4 h-4 text-white/60" />
          </button>
          <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
            <Download className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Avg Success Rate"
          value={successRateValue}
          icon={Shield}
          glowColor="emerald"
          trend={analyticsSummary?.successRateTrend}
          trendLabel="vs prev"
          description="Average success rate across all agent endpoints."
        />
        <StatCard
          title="Total Requests"
          value={totalRequestsValue}
          icon={Activity}
          glowColor="blue"
          trend={analyticsSummary?.totalRequestsTrend}
          trendLabel="vs prev"
          description="Total number of requests processed by your agents."
        />
        <StatCard
          title="Avg Latency"
          value={latencyValue}
          icon={Zap}
          glowColor="purple"
          trend={analyticsSummary?.avgLatencyTrend}
          trendReverse={true}
          trendLabel="vs prev"
          description="Average response time for agent verifications."
        />
        <StatCard
          title="Gas Savings"
          value={gasSavingsValue}
          icon={TrendingUp}
          glowColor="lime"
          trend={analyticsSummary?.gasSavingsTrend}
          trendLabel="vs prev"
          description="Estimated cost savings using GhostSpeak batching."
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Volume */}
        <div className="p-6 bg-[#111111] border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-white">Verification Volume</h3>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md border border-white/5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[10px] text-white/60 font-medium uppercase tracking-wider">
                Live Feed
              </span>
            </div>
          </div>

          <div className="h-[300px] w-full">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <GhostLoader variant="circle" />
              </div>
            ) : verificationData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/40 text-sm">
                No verification data yet. Start verifying agents to see trends.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={verificationData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ccff00" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ccff00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#ffffff20"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="#ffffff20"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                    itemStyle={{ color: '#ccff00', fontSize: '12px' }}
                    labelStyle={{ color: '#ffffff40', fontSize: '10px', marginBottom: '4px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#ccff00"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* API Performance */}
        <div className="p-6 bg-[#111111] border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-white">Endpoint Success Rate</h3>
          </div>

          <div className="h-[300px] w-full">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <GhostLoader variant="circle" />
              </div>
            ) : apiUsageData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/40 text-sm">
                No API usage yet. Create an API key to start tracking.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={apiUsageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#ffffff20"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="#ffffff20"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }}
                  />
                  <Bar
                    dataKey="success"
                    name="Success"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                    animationDuration={1000}
                  />
                  <Bar
                    dataKey="error"
                    name="Error"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                    animationDuration={1000}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Metrics Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Active Webhooks"
          value={detailedMetrics?.activeWebhooks?.toString() || '0'}
          trend={detailedMetrics?.activeWebhooksTrend}
        />
        <MetricCard label="Avg Response Size" value={detailedMetrics?.avgResponseSize || '0 KB'} />
        <MetricCard
          label="Rate Limit Hits"
          value={detailedMetrics?.rateLimitHits?.toString() || '0'}
          trend={detailedMetrics?.rateLimitHitsTrend}
        />
        <MetricCard label="Cold Storage Ratio" value={detailedMetrics?.coldStorageRatio || '0%'} />
      </div>

      {/* Heatmap Section */}
      <div className="p-6 bg-[#111111] border border-white/10 rounded-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">Network Participation</h3>
          <span className="text-[10px] text-white/40 font-mono">Last 365 Days</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 52 * 7 }).map((_: any, i: number) => {
            // Generate deterministic pattern based on index (avoids hydration mismatch)
            const intensity = (i * 7 + 3) % 10
            return (
              <div
                key={i}
                className={cn(
                  'w-3 h-3 rounded-sm transition-all duration-300',
                  intensity > 7
                    ? 'bg-primary/80'
                    : intensity > 4
                      ? 'bg-primary/40'
                      : 'bg-white/5 hover:bg-white/10'
                )}
                title={`Activity Level: ${intensity * 10}`}
              />
            )
          })}
        </div>
        <div className="flex items-center gap-2 mt-4 text-[10px] text-white/40">
          <span>Less</span>
          <div className="w-2 h-2 bg-white/5 rounded-sm" />
          <div className="w-2 h-2 bg-primary/20 rounded-sm" />
          <div className="w-2 h-2 bg-primary/40 rounded-sm" />
          <div className="w-2 h-2 bg-primary/60 rounded-sm" />
          <div className="w-2 h-2 bg-primary/80 rounded-sm" />
          <span>More</span>
        </div>
      </div>
    </motion.div>
  )
}
