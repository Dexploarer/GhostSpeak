'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface DashboardCardProps {
  title?: string
  description?: string
  icon?: LucideIcon
  children: React.ReactNode
  actions?: React.ReactNode
  loading?: boolean
  className?: string
  noPadding?: boolean
}

export function DashboardCard({
  title,
  description,
  icon: Icon,
  children,
  actions,
  loading,
  className,
  noPadding
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-card/50 backdrop-blur-xl border border-border transition-all',
        'hover:border-primary/20 hover:shadow-[0_0_30px_rgba(204,255,0,0.05)]',
        className
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-base font-bold text-foreground">{title}</h3>
              )}
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      
      <div className={cn(noPadding ? '' : 'p-6', loading && 'animate-pulse')}>
        {loading ? (
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
