'use client'

import React from 'react'
import { useWalletAddress } from '@/lib/hooks/useWalletAddress'
import { useAgents } from '@/lib/queries/agents'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { GlassTable } from '@/components/dashboard/shared/GlassTable'
import { StatusBeacon } from '@/components/dashboard/shared/StatusBeacon'
import { StatsCard } from '@/components/dashboard/shared/StatsCard'
import { ActivityChart } from '@/components/dashboard/shared/ActivityChart'
import { Button } from '@/components/ui/button'
import { 
  Bot, 
  Shield, 
  TrendingUp, 
  Activity, 
  Plus, 
  Clock,
  Users,
  Scale
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function DashboardOverview() {
  const { shortAddress, isConnected } = useWalletAddress()
  const { data: agents = [] } = useAgents()
  
  // Activity data for chart
  const chartData = [
    { name: '00:00', value: 40 },
    { name: '04:00', value: 30 },
    { name: '08:00', value: 20 },
    { name: '12:00', value: 78 },
    { name: '16:00', value: 89 },
    { name: '20:00', value: 63 },
    { name: '24:00', value: 45 },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Agent Marketplace
          </h1>
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

      {/* Stats Grid - Emphasize Trust Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          label="Escrowed Funds" 
          value="2,450.50" 
          unit="USDC" 
          trend="+12.5%" 
          trendUp={true} 
          icon={Shield} 
          iconColor="text-green-500" 
        />
        <StatsCard 
          label="My Agents" 
          value={agents.length.toString()} 
          unit="Registered" 
          trend={agents.length > 0 ? `+${agents.length}` : '0'} 
          trendUp={agents.length > 0} 
          icon={Bot} 
          iconColor="text-primary" 
        />
        <StatsCard 
          label="x402 Payments" 
          value="85.2k" 
          unit="Calls" 
          trend="+5.2%" 
          trendUp={true} 
          icon={Activity} 
          iconColor="text-cyan-500" 
        />
        <StatsCard 
          label="Reputation" 
          value="4.8" 
          unit="★" 
          trend="+0.2" 
          trendUp={true} 
          icon={TrendingUp} 
          iconColor="text-yellow-500" 
        />
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart / Activity Area (Span 2) */}
        <ActivityChart 
          className="lg:col-span-2" 
          title="Network Activity" 
          data={chartData} 
          height={320}
        />

        {/* Right Column Stack */}
        <div className="space-y-6">
          
          {/* Active Agents List */}
          <GlassCard className="p-6 flex flex-col h-[calc(50%-12px)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <Users className="w-5 h-5 text-cyan-500" />
                Top Agents
              </h3>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/agents">View All</Link>
              </Button>
            </div>
            <div className="space-y-3 overflow-y-auto pr-2">
              {agents.length > 0 ? agents.slice(0, 3).map((agent, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card/60 hover:bg-card/80 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/40 transition-all">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-medium text-foreground truncate">{agent.name}</h4>
                      <StatusBeacon status={agent.isActive ? 'active' : 'inactive'} size="sm" />
                    </div>
                    <p className="text-xs text-muted-foreground truncate font-mono">
                      {agent.address.slice(0, 4)}...{agent.address.slice(-4)}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No agents registered yet
                </div>
              )}
            </div>
          </GlassCard>

          {/* Trust Layer Info */}
          <GlassCard className="p-6 flex flex-col h-[calc(50%-12px)] bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <Scale className="w-5 h-5 text-green-500" />
                Trust Layer
              </h3>
            </div>
            <div className="space-y-4 flex-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Active Escrows</span>
                <span className="font-medium text-foreground">12</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Open Disputes</span>
                <span className="font-medium text-yellow-500">2</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Resolution Rate</span>
                <span className="font-medium text-green-500">98.5%</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/dashboard/escrow">Manage Escrows</Link>
            </Button>
          </GlassCard>

        </div>
      </div>
      
      {/* Recent Activity Feed */}
      <GlassTable
        title="Recent Transactions"
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/payments">View All</Link>
          </Button>
        }
        data={[
          { id: '#8X92...', type: 'x402 Payment', agent: 'GPT-4 Proxy', amount: '0.50 USDC', status: 'Completed', time: '2m ago' },
          { id: '#7A11...', type: 'Escrow Created', agent: 'Data Analyst', amount: '25.00 USDC', status: 'Active', time: '15m ago' },
          { id: '#3M22...', type: 'Escrow Released', agent: 'Code Reviewer', amount: '10.00 USDC', status: 'Completed', time: '1h ago' },
        ]}
        columns={[
          { header: 'ID', accessorKey: 'id', className: 'font-mono text-muted-foreground' },
          { header: 'Type', accessorKey: 'type', className: 'text-foreground' },
          { header: 'Agent', accessorKey: 'agent' },
          { header: 'Amount', accessorKey: 'amount', className: 'font-mono' },
          { 
            header: 'Status', 
            accessorKey: 'status', 
            cell: (item) => (
              <span className={cn(
                "px-2 py-1 rounded-full text-xs",
                item.status === 'Completed' ? "bg-green-500/10 text-green-500" : 
                item.status === 'Active' ? "bg-blue-500/10 text-blue-500" :
                "bg-yellow-500/10 text-yellow-500"
              )}>
                {item.status}
              </span>
            )
          },
          { header: 'Time', accessorKey: 'time', className: 'text-right text-muted-foreground' },
        ]}
      />
    </div>
  )
}
