'use client'

import React, { useMemo } from 'react'
import { useWalletAddress } from '@/lib/hooks/useWalletAddress'
import { useAgents } from '@/lib/queries/agents'
import { useEscrows, EscrowStatus } from '@/lib/queries/escrow'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { StatsCard } from '@/components/dashboard/shared/StatsCard'
import { ActivityChart } from '@/components/dashboard/shared/ActivityChart'
import { Button } from '@/components/ui/button'
import { Bot, Shield, TrendingUp, Activity, Plus, CheckCircle2, Scale } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function DashboardOverview() {
  const { shortAddress, isConnected, address } = useWalletAddress()
  const { data: agents = [], isLoading: isLoadingAgents } = useAgents()

  // Use 'all' role to see everything for now, can be refined to 'client' or 'agent'
  const { data: escrows = [], isLoading: isLoadingEscrows } = useEscrows({
    userAddress: address ?? undefined,
    role: 'all',
  })

  // Calculate stats from real data
  const stats = useMemo(() => {
    // Total Escrowed Funds (Active Escrows)
    const activeEscrows = escrows.filter((e) => e.status === EscrowStatus.Active)
    const totalEscrowed = activeEscrows.reduce((acc, curr) => {
      const decimals = curr.tokenMetadata?.decimals ?? 6
      return acc + Number(curr.amount) / Math.pow(10, decimals)
    }, 0)

    // Completed Payments (Escrows Completed)
    const completedEscrows = escrows.filter((e) => e.status === EscrowStatus.Completed)

    // Average Reputation
    const avgReputation =
      agents.length > 0
        ? agents.reduce((acc, curr) => acc + curr.reputation.score, 0) / agents.length
        : 0

    return {
      totalEscrowed,
      activeEscrowCount: activeEscrows.length,
      completedCount: completedEscrows.length,
      agentCount: agents.length,
      avgReputation,
    }
  }, [escrows, agents])

  // Process real escrow timestamps for the activity chart
  const chartData = useMemo(() => {
    // Initialize 24h buckets (every 4 hours)
    const buckets = [
      { name: '00:00', value: 0 },
      { name: '04:00', value: 0 },
      { name: '08:00', value: 0 },
      { name: '12:00', value: 0 },
      { name: '16:00', value: 0 },
      { name: '20:00', value: 0 },
      { name: '24:00', value: 0 },
    ]

    // If no data, just return the empty buckets (don't show random mock data)
    if (escrows.length === 0) return buckets

    // Simple distribution of escrow creation times (last 24h)
    // In a real indexer, we'd query this efficiently.
    // Here we just map client-side data to the nearest bucket for visualization.
    escrows.forEach((e) => {
      const hour = e.createdAt.getHours()
      // Map hour 0-23 to one of the 6 buckets roughly
      const bucketIndex = Math.floor(hour / 4)
      if (buckets[bucketIndex]) {
        buckets[bucketIndex].value += 1
      }
    })

    return buckets
  }, [escrows])

  const isLoading = isLoadingAgents || isLoadingEscrows

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold bg-linear-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Agent Marketplace
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-lime-500/10 text-lime-500 text-xs font-mono uppercase tracking-wider border border-lime-500/20">
              Devnet
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            Pay per call. Protected by escrow.{' '}
            <span className="font-mono text-primary">
              {isConnected ? shortAddress : 'Not connected'}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard/escrow">
              <Shield className="w-4 h-4 mr-2" />
              My Escrows
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/agents">
              <Plus className="w-4 h-4 mr-2" />
              Register Agent
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid - Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="active funds" // Lowercase label style
          value={isLoading ? '...' : `${stats.totalEscrowed.toFixed(2)}`}
          unit="Total Value" // Defaulting to value label as we might mix tokens
          trend={
            stats.activeEscrowCount > 0 ? `${stats.activeEscrowCount} active` : 'No active escrows'
          }
          trendUp={stats.activeEscrowCount > 0}
          icon={Shield}
          iconColor="text-green-500"
        />
        <StatsCard
          label="my agents"
          value={isLoading ? '...' : stats.agentCount.toString()}
          unit="Registered"
          trend={stats.agentCount > 0 ? 'Active' : 'No agents'}
          trendUp={stats.agentCount > 0}
          icon={Bot}
          iconColor="text-primary"
        />
        <StatsCard
          label="completed jobs"
          value={isLoading ? '...' : stats.completedCount.toString()}
          unit="Escrows"
          trend="Lifetime"
          trendUp={true}
          icon={Activity}
          iconColor="text-cyan-500"
        />
        <StatsCard
          label="avg reputation"
          value={isLoading ? '...' : stats.avgReputation.toFixed(1)}
          unit="/ 100"
          trend="Network"
          trendUp={true}
          icon={TrendingUp}
          iconColor="text-yellow-500"
        />
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Activity Volume</h3>
            <select className="bg-background border border-input rounded-md text-sm px-2 py-1">
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <ActivityChart data={chartData} height={300} />
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold">Recent Escrows(3)</h3>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <GlassCard key={i} className="h-20 animate-pulse" />
              ))}
            </div>
          ) : escrows.length === 0 ? (
            <GlassCard className="p-6 text-center text-muted-foreground border-dashed">
              No recent escrow activity.
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {escrows.slice(0, 3).map((escrow) => {
                const decimals = escrow.tokenMetadata?.decimals ?? 6
                const formattedAmount = (Number(escrow.amount) / Math.pow(10, decimals)).toFixed(2)
                const symbol = escrow.tokenMetadata?.symbol ?? 'USDC'

                return (
                  <GlassCard key={escrow.address} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center',
                          escrow.status === EscrowStatus.Active
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-gray-500/20 text-gray-500'
                        )}
                      >
                        {escrow.status === EscrowStatus.Active ? (
                          <Shield className="w-4 h-4" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{escrow.taskId}</p>
                        <p className="text-xs text-muted-foreground">{escrow.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formattedAmount}</p>
                      <p className="text-xs text-muted-foreground">{symbol}</p>
                    </div>
                  </GlassCard>
                )
              })}
            </div>
          )}

          <Button variant="outline" className="w-full" asChild>
            <Link href="/dashboard/escrow">View All Activity</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
