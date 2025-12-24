/**
 * x402 Analytics Dashboard Component
 *
 * Real-time metrics and visualizations for x402 platform
 */

'use client'

import React from 'react'
import { TrendingUp, TrendingDown, DollarSign, Activity, Users, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useX402PlatformStats, useX402Analytics } from '@/lib/hooks/useX402'

export function AnalyticsDashboard(): React.JSX.Element {
  const { data: platformStats, isLoading } = useX402PlatformStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const stats = platformStats ?? {
    totalVolume: BigInt(0),
    totalPayments: 0,
    averagePayment: BigInt(0),
    successRate: 0,
    activeAgents: 0,
    topAgents: [],
  }

  const totalVolumeSol = Number(stats.totalVolume) / 1e9
  const averagePaymentSol = Number(stats.averagePayment) / 1e9

  return (
    <div className="space-y-6">
      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Volume"
          value={`${totalVolumeSol.toFixed(2)} SOL`}
          icon={DollarSign}
          trend={5.2}
          color="from-green-500 to-emerald-600"
        />
        <StatCard
          title="Total Payments"
          value={stats.totalPayments.toLocaleString()}
          icon={Activity}
          trend={8.1}
          color="from-cyan-500 to-blue-600"
        />
        <StatCard
          title="Success Rate"
          value={`${(stats.successRate * 100).toFixed(1)}%`}
          icon={Zap}
          trend={-2.3}
          color="from-purple-500 to-pink-600"
        />
        <StatCard
          title="Active Agents"
          value={stats.activeAgents.toString()}
          icon={Users}
          trend={12.5}
          color="from-orange-500 to-red-600"
        />
      </div>

      {/* Average Payment */}
      <Card>
        <CardHeader>
          <CardTitle>Average Payment Size</CardTitle>
          <CardDescription>Mean transaction value across all x402 payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold gradient-text">{averagePaymentSol.toFixed(6)} SOL</div>
        </CardContent>
      </Card>

      {/* Top Performing Agents */}
      {stats.topAgents && stats.topAgents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Agents</CardTitle>
            <CardDescription>Highest earning agents in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topAgents.slice(0, 5).map(
                (
                  agent: {
                    address: string
                    name: string
                    earnings?: bigint
                    totalCalls?: number
                    successRate?: number
                  },
                  index: number
                ) => {
                  const earnings = Number(agent.earnings ?? 0) / 1e9

                  return (
                    <div
                      key={agent.address}
                      className="flex items-center justify-between p-3 glass rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-linear-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-sm text-gray-500">{agent.totalCalls ?? 0} calls</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold gradient-text">
                          {earnings.toFixed(4)} SOL
                        </div>
                        {agent.successRate !== undefined && (
                          <div className="text-xs text-gray-500">
                            {(agent.successRate * 100).toFixed(1)}% success
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  trend?: number
  color: string
}

function StatCard({ title, value, icon: Icon, trend, color }: StatCardProps): React.JSX.Element {
  const isPositive = trend !== undefined && trend > 0
  const TrendIcon = isPositive ? TrendingUp : TrendingDown

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg bg-linear-to-r ${color} bg-opacity-10`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {trend !== undefined && (
            <div
              className={`flex items-center gap-1 text-sm ${
                isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              <TrendIcon className="w-4 h-4" />
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</h3>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}

export function UserAnalyticsDashboard(): React.JSX.Element {
  const { data: analytics, isLoading } = useX402Analytics()

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No analytics data available</p>
        </CardContent>
      </Card>
    )
  }

  const totalSpent = Number(analytics.totalSpent ?? 0) / 1e9
  const totalEarned = Number(analytics.totalEarned ?? 0) / 1e9

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Total Spent</CardTitle>
          <CardDescription>x402 payments made</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold gradient-text">{totalSpent.toFixed(4)} SOL</div>
          <div className="text-sm text-gray-500 mt-2">
            {analytics.totalPaymentsSent ?? 0} transactions
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total Earned</CardTitle>
          <CardDescription>x402 payments received</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold gradient-text">{totalEarned.toFixed(4)} SOL</div>
          <div className="text-sm text-gray-500 mt-2">
            {analytics.totalPaymentsReceived ?? 0} transactions
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Success Rate</CardTitle>
          <CardDescription>Payment completion rate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold gradient-text">
            {((analytics.successRate ?? 0) * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500 mt-2">
            {analytics.successfulPayments ?? 0} successful
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
