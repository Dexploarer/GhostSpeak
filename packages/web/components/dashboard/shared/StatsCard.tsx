import React from 'react'
import { GlassCard } from './GlassCard'
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  label: string
  value: string | number
  unit?: string
  trend?: string
  trendUp?: boolean
  icon: LucideIcon
  iconColor?: string
  className?: string
}

export function StatsCard({
  label,
  value,
  unit,
  trend,
  trendUp,
  icon: Icon,
  iconColor = "text-purple-400",
  className
}: StatsCardProps) {
  return (
    <GlassCard variant="hover" className={cn("p-6 relative overflow-hidden group", className)}>
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
        <Icon className="w-24 h-24" />
      </div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={cn("p-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/5", iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center text-xs font-medium px-2 py-1 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm",
            trendUp ? "text-green-400" : "text-red-400"
          )}>
            {trend}
            {trendUp ? <TrendingUp className="w-3 h-3 ml-1" /> : <TrendingDown className="w-3 h-3 ml-1" />}
          </div>
        )}
      </div>
      
      <div className="relative z-10">
        <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <h3 className="text-2xl font-bold text-gray-100 tracking-tight">{String(value)}</h3>
          {unit && <span className="text-xs text-gray-500 font-mono">{unit}</span>}
        </div>
      </div>
    </GlassCard>
  )
}
