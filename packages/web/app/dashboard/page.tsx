'use client'

import React, { useMemo } from 'react'
import { useWalletAddress } from '@/lib/hooks/useWalletAddress'
import { useAgents } from '@/lib/queries/agents'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { StatsCard } from '@/components/dashboard/shared/StatsCard'
import { ActivityChart } from '@/components/dashboard/shared/ActivityChart'
import { UserStatsCard } from '@/components/convex/UserStatsCard'
import { Button } from '@/components/ui/button'
import { Bot, Shield as _Shield, TrendingUp, Activity, Plus, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function DashboardOverview() {
  const { shortAddress, isConnected } = useWalletAddress()
  const { data: agents = [], isLoading: isLoadingAgents } = useAgents()

  // Calculate stats from real data
  const stats = useMemo(() => {
    // Average Reputation
    const avgReputation =
      agents.length > 0
        ? agents.reduce((acc, curr) => acc + curr.reputation.score, 0) / agents.length
        : 0

    // Active agents (those with recent activity)
    const activeAgentCount = agents.filter((a) => a.reputation.score > 0).length

    return {
      agentCount: agents.length,
      activeAgentCount,
      avgReputation,
    }
  }, [agents])

  // Chart data for agent activity (mock for now - will integrate with PayAI events)
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

    // No escrow data - will be replaced with PayAI payment events
    return buckets
  }, [])

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Agent Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-lime-500/10 text-lime-500 text-[10px] sm:text-xs font-mono uppercase tracking-wider border border-lime-500/20">
              Devnet
            </span>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage agents, credentials, and reputation.{' '}
            <span className="font-mono text-primary">
              {isConnected ? shortAddress : 'Not connected'}
            </span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/dashboard/credentials">
              <Award className="w-4 h-4 mr-2" />
              My Credentials
            </Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard/agents">
              <Plus className="w-4 h-4 mr-2" />
              Register Agent
            </Link>
          </Button>
        </div>
      </div>

      {/* Convex User Activity Stats */}
      <UserStatsCard />

      {/* Stats Grid - Agent Focused */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          label="my agents"
          value={isLoadingAgents ? '...' : stats.agentCount.toString()}
          unit="Registered"
          trend={stats.agentCount > 0 ? 'Active' : 'No agents'}
          trendUp={stats.agentCount > 0}
          icon={Bot}
          iconColor="text-primary"
        />
        <StatsCard
          label="active agents"
          value={isLoadingAgents ? '...' : stats.activeAgentCount.toString()}
          unit="With Activity"
          trend={stats.activeAgentCount > 0 ? 'Online' : 'Inactive'}
          trendUp={stats.activeAgentCount > 0}
          icon={Activity}
          iconColor="text-green-500"
        />
        <StatsCard
          label="avg reputation"
          value={isLoadingAgents ? '...' : stats.avgReputation.toFixed(1)}
          unit="/ 100"
          trend="Network"
          trendUp={true}
          icon={TrendingUp}
          iconColor="text-yellow-500"
        />
        <StatsCard
          label="credentials"
          value="0"
          unit="Verified"
          trend="Verifiable"
          trendUp={true}
          icon={Award}
          iconColor="text-cyan-500"
        />
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-bold">Agent Activity</h3>
            <select className="bg-background border border-input rounded-md text-xs sm:text-sm px-2 py-1 w-full sm:w-auto">
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <ActivityChart data={chartData} height={250} />
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold">My Agents</h3>
          {isLoadingAgents ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <GlassCard key={i} className="h-20 animate-pulse" />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <GlassCard className="p-6 text-center text-muted-foreground border-dashed">
              No agents registered yet.
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {agents.slice(0, 3).map((agent) => (
                <GlassCard key={agent.address} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        agent.reputation.score > 50
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-gray-500/20 text-gray-500'
                      )}
                    >
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{agent.name || 'Unnamed Agent'}</p>
                      <p className="text-xs text-muted-foreground">
                        Rep: {agent.reputation.score.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-mono">
                      {agent.address.slice(0, 6)}...{agent.address.slice(-4)}
                    </p>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          <Button variant="outline" className="w-full" asChild>
            <Link href="/dashboard/agents">View All Agents</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
