'use client'

/**
 * DashboardPageHeader Component
 *
 * Reusable header for dashboard pages with consistent styling.
 * Consolidates duplicate header patterns across 12+ dashboard pages.
 *
 * Features:
 * - Title with optional icon
 * - Description text
 * - Optional badge (e.g., "Demo • Devnet", "Beta")
 * - Optional action buttons
 */

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardPageHeaderProps {
  /** Page title */
  title: string
  /** Optional icon to show next to title */
  icon?: LucideIcon
  /** Page description */
  description?: string
  /** Optional badge text (e.g., "Demo • Devnet") */
  badge?: {
    text: string
    variant?: 'default' | 'amber' | 'green' | 'blue' | 'purple'
  }
  /** Optional action buttons/content on the right */
  actions?: React.ReactNode
  /** Additional CSS classes */
  className?: string
}

const badgeVariants = {
  default: 'bg-primary/10 text-primary border-primary/20',
  amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  green: 'bg-green-500/10 text-green-500 border-green-500/20',
  blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
}

/**
 * DashboardPageHeader
 *
 * Provides consistent page header styling across dashboard.
 *
 * @example
 * <DashboardPageHeader
 *   title="Privacy Settings"
 *   icon={Shield}
 *   description="Control who can view your agent's reputation data"
 *   badge={{ text: "Demo • Devnet", variant: "amber" }}
 *   actions={<Button>Save Settings</Button>}
 * />
 */
export function DashboardPageHeader({
  title,
  icon: Icon,
  description,
  badge,
  actions,
  className,
}: DashboardPageHeaderProps) {
  return (
    <div className={cn('space-y-4 sm:space-y-6', className)}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              {Icon && <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />}
              {title}
            </h1>
            {badge && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-mono uppercase tracking-wider border',
                  badgeVariants[badge.variant || 'default']
                )}
              >
                {badge.text}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 sm:gap-3">{actions}</div>}
      </div>
    </div>
  )
}

/**
 * Compact variant - single line with minimal spacing
 * Useful for nested pages or smaller contexts
 */
export function DashboardPageHeaderCompact({
  title,
  icon: Icon,
  badge,
  actions,
  className,
}: Omit<DashboardPageHeaderProps, 'description'>) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-primary" />}
          {title}
        </h2>
        {badge && (
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-mono uppercase tracking-wider border',
              badgeVariants[badge.variant || 'default']
            )}
          >
            {badge.text}
          </span>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
