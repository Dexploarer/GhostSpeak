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
  Zap
} from 'lucide-react'

export default function AnalyticsPage() {
  // Mock data
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
        title="Performance Analytics" 
        description="Deep insights into agent performance and network utilization"
      />

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          label="Avg Response Time" 
          value="145" 
          unit="ms" 
          trend="-5%" 
          trendUp={true} 
          icon={Activity} 
          iconColor="text-blue-400" 
        />
        <StatsCard 
          label="Success Rate" 
          value="99.2" 
          unit="%" 
          trend="+0.1%" 
          trendUp={true} 
          icon={Zap} 
          iconColor="text-green-400" 
        />
        <StatsCard 
          label="Total Errors" 
          value="24" 
          unit="errs" 
          trend="+2" 
          trendUp={false} 
          icon={ArrowDownRight} 
          iconColor="text-red-400" 
        />
        <StatsCard 
          label="Network Load" 
          value="42" 
          unit="%" 
          trend="Stable" 
          trendUp={true} 
          icon={BarChart3} 
          iconColor="text-lime-400" 
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityChart 
          title="Revenue Growth (7D)" 
          data={revenueData} 
          color="#eab308" // yellow
          height={300}
        />
        <ActivityChart 
          title="Request Volume (7D)" 
          data={requestsData} 
          type="bar"
          color="#06b6d4" // cyan
          height={300}
        />
      </div>

      {/* Detailed Metrics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Regional Traffic Distribution</h3>
          <div className="h-[200px] flex items-center justify-center border border-dashed border-white/10 rounded-lg bg-black/20">
            <p className="text-gray-500 text-sm">Map Visualization Placeholder</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
           <h3 className="text-lg font-semibold text-white mb-4">Top Performing Agents</h3>
           <div className="space-y-4">
              {[1,2,3,4].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 font-bold text-xs">
                      #{i}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-200">GPT-4 Proxy</p>
                      <p className="text-xs text-gray-500">2.4k requests</p>
                    </div>
                  </div>
                  <span className="text-green-400 text-sm font-mono">+12%</span>
                </div>
              ))}
           </div>
        </GlassCard>
      </div>
    </div>
  )
}