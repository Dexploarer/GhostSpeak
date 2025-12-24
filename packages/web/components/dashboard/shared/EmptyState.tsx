import React from 'react'
import { GlassCard } from './GlassCard'
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <GlassCard className="p-12 flex flex-col items-center justify-center text-center border-dashed border-white/10 bg-transparent">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 animate-in fade-in zoom-in duration-500">
        <Icon className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 max-w-sm mb-6 text-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          variant="secondary"
          className="bg-white/10 hover:bg-white/20 text-white border border-white/10"
        >
          {actionLabel}
        </Button>
      )}
    </GlassCard>
  )
}
