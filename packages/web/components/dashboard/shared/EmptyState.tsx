'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  secondaryAction?: { 
    label: string
    onClick: () => void 
  }
  features?: string[]
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryAction,
  features,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border-2 border-dashed border-border bg-card/30 backdrop-blur-xl',
        'p-12 flex flex-col items-center justify-center text-center',
        className
      )}
    >
      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(204,255,0,0.15)]">
        <Icon className="w-10 h-10 text-primary" />
      </div>

      {/* Title & Description */}
      <h3 className="text-xl font-black text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      {/* Features list */}
      {features && features.length > 0 && (
        <ul className="mb-8 space-y-2 text-left">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {feature}
            </li>
          ))}
        </ul>
      )}

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-3">
        {actionLabel && onAction && (
          <Button
            onClick={onAction}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-[0_0_20px_rgba(204,255,0,0.2)]"
          >
            {actionLabel}
          </Button>
        )}
        {secondaryAction && (
          <Button
            variant="outline"
            onClick={secondaryAction.onClick}
            className="border-border hover:bg-muted"
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  )
}
