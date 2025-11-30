import React from 'react'
import { cn } from '@/lib/utils'

interface StatusBeaconProps {
  status: 'active' | 'inactive' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function StatusBeacon({ status, size = 'md', className }: StatusBeaconProps) {
  const colors = {
    active: 'bg-cyan-400 shadow-cyan-400/50',
    inactive: 'bg-gray-500 shadow-gray-500/50',
    warning: 'bg-yellow-400 shadow-yellow-400/50',
    error: 'bg-red-500 shadow-red-500/50',
  }

  const sizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  }

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {status === 'active' && (
        <span className={cn(
          'absolute inline-flex animate-ping rounded-full opacity-75',
          colors[status],
          sizes[size]
        )} />
      )}
      <span className={cn(
        'relative inline-flex rounded-full shadow-[0_0_8px]',
        colors[status],
        sizes[size]
      )} />
    </div>
  )
}
