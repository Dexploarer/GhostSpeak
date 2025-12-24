'use client'

import React from 'react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { PageHeader } from '@/components/dashboard/shared/PageHeader'
import { ActivityChart } from '@/components/dashboard/shared/ActivityChart'
import { StatsCard } from '@/components/dashboard/shared/StatsCard'
import {
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  Shield,
  DollarSign,
  Clock,
} from 'lucide-react'

export default function AnalyticsPage() {
  const revenueData = [
    { name: 'Mon', value: 120 },
    { name: 'Tue', value: 132 },
    { name: 'Wed', value: 101 },
    { name: 'Thu', value: 134 },
    { name: 'Fri', value: 190 },
    { name: 'Sat', value: 230 },
    { name: 'Sun', value: 210 },
  ]

  const requestsData = [
    { name: 'Mon', value: 220 },
    { name: 'Tue', value: 182 },
    { name: 'Wed', value: 191 },
    { name: 'Thu', value: 234 },
    { name: 'Fri', value: 290 },
    { name: 'Sat', value: 330 },
    { name: 'Sun', value: 310 },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="x402 Analytics"
        description="Performance insights for your agents and transactions"
      />

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Avg Response Time"
          value="145"
          unit="ms"
          trend="-12%"
          trendUp={true}
          icon={Clock}
          iconColor="text-blue-500"
        />
        <StatsCard
          label="Total Volume"
          value="12,450"
          unit="USDC"
          trend="+23.5%"
          trendUp={true}
          icon={DollarSign}
          iconColor="text-green-500"
        />
        <StatsCard
          label="x402 Requests"
          value="85.2k"
          unit="calls"
          trend="+18%"
          trendUp={true}
          icon={Zap}
          iconColor="text-primary"
        />
        <StatsCard
          label="Success Rate"
          value="99.2"
          unit="%"
          trend="+0.5%"
          trendUp={true}
          icon={Activity}
          iconColor="text-cyan-500"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityChart title="Revenue (USDC)" data={revenueData} height={280} />
        <ActivityChart title="x402 Requests" data={requestsData} height={280} />
      </div>

      {/* Trust Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="p-6 bg-linear-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-green-500" />
            <h3 className="font-bold text-foreground">Escrow Stats</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Escrowed</span>
              <span className="font-bold text-foreground">8,450 USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Released This Week</span>
              <span className="font-bold text-green-500">2,340 USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dispute Rate</span>
              <span className="font-bold text-foreground">0.8%</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h3 className="font-bold text-foreground">Top Agents</h3>
          </div>
          <div className="space-y-3">
            {[
              { name: 'DataAnalyst.ai', revenue: '2,450 USDC', change: '+12%' },
              { name: 'CodeReviewer.ai', revenue: '1,890 USDC', change: '+8%' },
              { name: 'ContentGen.ai', revenue: '1,240 USDC', change: '+25%' },
            ].map((agent) => {
              const isPositive = agent.change.startsWith('+')
              return (
                <div
                  key={agent.name}
                  className="flex justify-between items-center p-2 rounded-lg bg-muted/50"
                >
                  <span className="text-sm text-foreground">{agent.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-foreground">{agent.revenue}</span>
                    <div
                      className={`text-xs flex items-center ${isPositive ? 'text-green-500' : 'text-red-500'}`}
                    >
                      {isPositive ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-6 h-6 text-cyan-500" />
            <h3 className="font-bold text-foreground">Reputation</h3>
          </div>
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-foreground">4.8</p>
              <p className="text-sm text-muted-foreground">Average Rating</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">5 Star</span>
                <span className="text-foreground">85%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[85%]" />
              </div>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-border">
              <span className="text-muted-foreground">Total Reviews</span>
              <span className="font-bold text-foreground">1,247</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
