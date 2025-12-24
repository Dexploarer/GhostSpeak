'use client'

import { cn } from '@/lib/utils'
import { Radio, Loader2 } from 'lucide-react'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface RealtimeIndicatorProps {
  status: ConnectionStatus
  lastUpdate?: Date | null
  label?: string
  className?: string
}

export function RealtimeIndicator({
  status,
  lastUpdate,
  label = 'Live',
  className,
}: RealtimeIndicatorProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-500'
      case 'connecting':
        return 'text-yellow-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-muted-foreground'
    }
  }

  const getStatusBg = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500/10 border-green-500/20'
      case 'connecting':
        return 'bg-yellow-500/10 border-yellow-500/20'
      case 'error':
        return 'bg-red-500/10 border-red-500/20'
      default:
        return 'bg-muted border-border'
    }
  }

  const formatLastUpdate = () => {
    if (!lastUpdate) return null
    const now = new Date()
    const diff = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000)

    if (diff < 5) return 'Just now'
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return lastUpdate.toLocaleTimeString()
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium',
        getStatusBg(),
        getStatusColor(),
        className
      )}
    >
      {status === 'connecting' ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : status === 'connected' ? (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
      ) : (
        <Radio className="w-3 h-3" />
      )}
      <span>{label}</span>
      {lastUpdate && status === 'connected' && (
        <span className="text-muted-foreground ml-1">• {formatLastUpdate()}</span>
      )}
    </div>
  )
}

// Compact version for inline use
export function RealtimeDot({
  status,
  className,
}: {
  status: ConnectionStatus
  className?: string
}) {
  return (
    <span className={cn('relative inline-flex h-2 w-2', className)} title={`Real-time: ${status}`}>
      {status === 'connected' && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full h-2 w-2',
          status === 'connected' && 'bg-green-500',
          status === 'connecting' && 'bg-yellow-500 animate-pulse',
          status === 'error' && 'bg-red-500',
          status === 'disconnected' && 'bg-muted-foreground'
        )}
      />
    </span>
  )
}

// Update badge that appears when new data is available
interface UpdateBadgeProps {
  count?: number
  onClick?: () => void
  className?: string
}

export function UpdateBadge({ count = 0, onClick, className }: UpdateBadgeProps) {
  if (count === 0) return null

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
        'bg-primary text-primary-foreground text-xs font-medium',
        'hover:bg-primary/90 transition-colors',
        'animate-in fade-in slide-in-from-top-2',
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
      </span>
      {count} new update{count > 1 ? 's' : ''}
    </button>
  )
}
