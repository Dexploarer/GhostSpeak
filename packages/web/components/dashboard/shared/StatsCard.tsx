'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  label: string
  value: string | number
  unit?: string
  trend?: string
  trendUp?: boolean
  icon: LucideIcon
  className?: string
  loading?: boolean
}

export function StatsCard({
  label,
  value,
  unit,
  trend,
  trendUp,
  icon: Icon,
  className,
  loading
}: StatsCardProps) {
  if (loading) {
    return (
      <div className={cn(
        'rounded-2xl bg-card/50 backdrop-blur-xl border border-border p-6 animate-pulse',
        className
      )}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-muted" />
          <div className="h-4 bg-muted rounded w-16" />
        </div>
        <div className="h-8 bg-muted rounded w-24" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-2xl bg-card/50 backdrop-blur-xl border border-border p-6 relative overflow-hidden group',
        'hover:border-primary/20 hover:shadow-[0_0_30px_rgba(204,255,0,0.05)] transition-all',
        className
      )}
    >
      {/* Background icon */}
      <div className="absolute -top-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-32 h-32 text-primary" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full',
              trendUp
                ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                : 'bg-red-500/10 text-red-500 border border-red-500/20'
            )}
          >
            {trend}
            {trendUp ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="relative z-10">
        <p className="text-sm text-muted-foreground font-medium mb-1">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-foreground tracking-tight">
            {String(value)}
          </span>
          {unit && (
            <span className="text-xs text-muted-foreground font-mono uppercase">
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
