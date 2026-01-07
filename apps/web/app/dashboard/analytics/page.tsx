'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Shield, Activity, Zap, TrendingUp,
  Filter, Download
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatCard } from '@/components/ui/enhanced/StatCard'
import { MetricCard } from '../../../components/ui/enhanced/MetricCard'

// Mock data for charts
const verificationData = [
  { name: 'Mon', count: 12, quality: 85 },
  { name: 'Tue', count: 19, quality: 88 },
  { name: 'Wed', count: 15, quality: 84 },
  { name: 'Thu', count: 22, quality: 91 },
  { name: 'Fri', count: 30, quality: 94 },
  { name: 'Sat', count: 25, quality: 92 },
  { name: 'Sun', count: 28, quality: 95 },
]

const apiUsageData = [
  { name: 'Identity', success: 400, error: 20 },
  { name: 'Capability', success: 300, error: 45 },
  { name: 'Reputation', success: 200, error: 10 },
  { name: 'Payment', success: 278, error: 30 },
  { name: 'Discovery', success: 189, error: 15 },
]

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 lg:p-10 space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Performance Analytics</h1>
          <p className="text-white/40 mt-1">Deep insights into your agent's performance and protocol activity.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 border border-white/10 rounded-lg p-1">
            {['24h', '7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  timeRange === range ? "bg-primary text-black" : "text-white/60 hover:text-white"
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
          value="98.2%"
          icon={Shield}
          glowColor="emerald"
          trend={1.2}
          trendLabel="vs prev"
          description="Average success rate across all agent endpoints."
        />
        <StatCard
          title="Total Requests"
          value="12.5K"
          icon={Activity}
          glowColor="blue"
          trend={15.4}
          trendLabel="vs prev"
          description="Total number of requests processed by your agents."
        />
        <StatCard
          title="Avg Latency"
          value="184ms"
          icon={Zap}
          glowColor="purple"
          trend={-8.5}
          trendReverse={true}
          trendLabel="vs prev"
          description="Average response time for agent verifications."
        />
        <StatCard
          title="Gas Savings"
          value="$42.50"
          icon={TrendingUp}
          glowColor="lime"
          trend={22.1}
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
              <span className="text-[10px] text-white/60 font-medium uppercase tracking-wider">Live Feed</span>
            </div>
          </div>

          <div className="h-[300px] w-full">
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
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
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
          </div>
        </div>

        {/* API Performance */}
        <div className="p-6 bg-[#111111] border border-white/10 rounded-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-white">Endpoint Success Rate</h3>
          </div>

          <div className="h-[300px] w-full">
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
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
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
          </div>
        </div>
      </div>

      {/* Detailed Metrics Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Active Webhooks"
          value="12"
          trend={2}
        />
        <MetricCard
          label="Avg Response Size"
          value="2.4 KB"
        />
        <MetricCard
          label="Rate Limit Hits"
          value="45"
          trend={-12}
        />
        <MetricCard
          label="Cold Storage Ratio"
          value="85%"
        />
      </div>

      {/* Heatmap Placeholder Section */}
      <div className="p-6 bg-[#111111] border border-white/10 rounded-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">Network Participation</h3>
          <span className="text-[10px] text-white/40 font-mono">Last 365 Days</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 52 * 7 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-3 h-3 rounded-sm transition-all duration-300",
                Math.random() > 0.7 ? "bg-primary/80" :
                  Math.random() > 0.4 ? "bg-primary/40" :
                    "bg-white/5 hover:bg-white/10"
              )}
              title={`Activity Level: ${Math.floor(Math.random() * 100)}`}
            />
          ))}
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
