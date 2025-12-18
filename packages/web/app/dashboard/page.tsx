'use client'

import React from 'react'
import { useWallet } from '@/lib/stubs/wallet-stubs'
import { useAgents } from '@/lib/queries/agents'
import { useChannels } from '@/lib/queries/channels'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { GlassTable } from '@/components/dashboard/shared/GlassTable'
import { StatusBeacon } from '@/components/dashboard/shared/StatusBeacon'
import { StatsCard } from '@/components/dashboard/shared/StatsCard'
import { ActivityChart } from '@/components/dashboard/shared/ActivityChart'
import { Button } from '@/components/ui/button'
import { 
  Bot, 
  Zap, 
  TrendingUp, 
  Activity, 
  Plus, 
  Clock,
  Users,
  Cpu
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DashboardOverview() {
  const { publicKey } = useWallet()
  const { data: agents = [] } = useAgents()
  
  // Mock Data for Activity Chart
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
          <h1 className="text-3xl font-bold bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Command Center
          </h1>
          <p className="text-gray-400 mt-1">
            System Overview for <span className="font-mono text-lime-400">{(publicKey as any)?.toBase58?.().slice(0,6) || 'Wallet'}...</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-gray-200">
            <Clock className="w-4 h-4 mr-2" />
            History
          </Button>
          <Button className="bg-lime-500 hover:bg-lime-400 text-black font-bold border-0 shadow-[0_0_20px_-5px_rgba(204,255,0,0.5)]">
            <Plus className="w-4 h-4 mr-2" />
            Deploy Agent
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          label="Total Revenue" 
          value="2,450.50" 
          unit="SOL" 
          trend="+12.5%" 
          trendUp={true} 
          icon={Zap} 
          iconColor="text-yellow-400" 
        />
        <StatsCard 
          label="Active Agents" 
          value={agents.length.toString()} 
          unit="Online" 
          trend="+2" 
          trendUp={true} 
          icon={Bot} 
          iconColor="text-lime-400" 
        />
        <StatsCard 
          label="Total Requests" 
          value="85.2k" 
          unit="Calls" 
          trend="+5.2%" 
          trendUp={true} 
          icon={Activity} 
          iconColor="text-cyan-400" 
        />
        <StatsCard 
          label="Avg. Latency" 
          value="124" 
          unit="ms" 
          trend="-12ms" 
          trendUp={true} 
          icon={Clock} 
          iconColor="text-green-400" 
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
              <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                <Users className="w-5 h-5 text-cyan-400" />
                Top Agents
              </h3>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10">View All</Button>
            </div>
            <div className="space-y-3 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
              {agents.length > 0 ? agents.slice(0, 3).map((agent, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-lg bg-lime-500/20 flex items-center justify-center text-lime-400 group-hover:text-white group-hover:bg-lime-500/40 transition-all">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-medium text-gray-200 truncate">{agent.name}</h4>
                      <StatusBeacon status={agent.isActive ? 'active' : 'inactive'} size="sm" />
                    </div>
                    <p className="text-xs text-gray-500 truncate font-mono">{agent.address.slice(0, 4)}...{agent.address.slice(-4)}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500 text-sm">No agents deployed</div>
              )}
            </div>
          </GlassCard>

          {/* System Health / Resources */}
          <GlassCard className="p-6 flex flex-col h-[calc(50%-12px)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                <Cpu className="w-5 h-5 text-green-400" />
                System Health
              </h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Compute Units</span>
                  <span>78%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-linear-to-r from-green-500 to-yellow-500 w-[78%]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>RPC Throughput</span>
                  <span>45%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[45%]" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                 <span className="text-xs text-gray-500">Status</span>
                 <span className="text-xs font-medium text-green-400 flex items-center gap-1">
                    <StatusBeacon status="active" size="sm" />
                    Operational
                 </span>
              </div>
            </div>
          </GlassCard>

        </div>
      </div>
      
      {/* Recent Activity Feed (Bottom Full Width) */}
      <GlassTable
        title="Recent Transactions"
        actions={
          <Button variant="ghost" size="sm" className="text-xs text-gray-400 hover:text-white">View All Transactions</Button>
        }
        data={[
          { id: '#8X92...', type: 'Service Call', agent: 'GPT-4 Proxy Agent', amount: '0.05 SOL', status: 'Completed', time: '2m ago' },
          { id: '#7A11...', type: 'Subscription', agent: 'Arbitrage Bot', amount: '1.20 SOL', status: 'Completed', time: '15m ago' },
          { id: '#3M22...', type: 'Data Query', agent: 'Market Analyst', amount: '0.15 SOL', status: 'Pending', time: '1h ago' },
        ]}
        columns={[
          { header: 'ID', accessorKey: 'id', className: 'font-mono text-gray-400' },
          { header: 'Type', accessorKey: 'type', className: 'text-gray-300' },
          { header: 'Agent', accessorKey: 'agent' },
          { header: 'Amount', accessorKey: 'amount', className: 'font-mono' },
          { 
            header: 'Status', 
            accessorKey: 'status', 
            cell: (item) => (
              <span className={cn(
                "px-2 py-1 rounded-full text-xs",
                item.status === 'Completed' ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
              )}>
                {item.status}
              </span>
            )
          },
          { header: 'Time', accessorKey: 'time', className: 'text-right text-gray-500' },
        ]}
      />
    </div>
  )
}
