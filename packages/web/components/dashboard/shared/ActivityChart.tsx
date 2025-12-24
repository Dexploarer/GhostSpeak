'use client'

import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { GlassCard } from './GlassCard'
import { cn } from '@/lib/utils'

interface ActivityChartProps {
  data: Record<string, unknown>[]
  type?: 'area' | 'bar'
  height?: number
  title?: string
  color?: string
  className?: string
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number | string }[]
  label?: string
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-lg shadow-xl">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        <p className="text-white font-bold text-sm">
          {payload[0].value}
          <span className="text-gray-500 ml-1 font-normal">reqs</span>
        </p>
      </div>
    )
  }
  return null
}

export function ActivityChart({
  data,
  type = 'area',
  height = 300,
  title,
  color = '#8b5cf6',
  className,
}: ActivityChartProps) {
  return (
    <GlassCard className={cn('p-6 flex flex-col', className)}>
      {title && (
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
        </div>
      )}

      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'area' ? (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                dy={10}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorGradient)"
              />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                dy={10}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </GlassCard>
  )
}
