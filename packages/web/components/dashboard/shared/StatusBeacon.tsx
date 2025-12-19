'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface StatusBeaconProps {
  status: 'active' | 'inactive' | 'pending' | 'error' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
  className?: string
}

const statusColors = {
  active: {
    bg: 'bg-green-500',
    glow: 'shadow-green-500/50',
    ring: 'ring-green-500/30'
  },
  inactive: {
    bg: 'bg-gray-500',
    glow: 'shadow-gray-500/50',
    ring: 'ring-gray-500/30'
  },
  pending: {
    bg: 'bg-yellow-500',
    glow: 'shadow-yellow-500/50',
    ring: 'ring-yellow-500/30'
  },
  error: {
    bg: 'bg-red-500',
    glow: 'shadow-red-500/50',
    ring: 'ring-red-500/30'
  },
  warning: {
    bg: 'bg-orange-500',
    glow: 'shadow-orange-500/50',
    ring: 'ring-orange-500/30'
  }
}

const sizes = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4'
}

export function StatusBeacon({ 
  status, 
  size = 'md', 
  pulse = true,
  className 
}: StatusBeaconProps) {
  const colors = statusColors[status]
  const sizeClass = sizes[size]
  
  // Only pulse for active and pending statuses by default
  const shouldPulse = pulse && (status === 'active' || status === 'pending')
  
  return (
    <span className={cn('relative inline-flex', className)}>
      {/* Outer glow ring (for active states) */}
      {shouldPulse && (
        <span 
          className={cn(
            'absolute inset-0 rounded-full animate-ping opacity-75',
            colors.bg
          )}
          style={{ animationDuration: '2s' }}
        />
      )}
      
      {/* Main beacon dot */}
      <span 
        className={cn(
          'relative inline-flex rounded-full',
          sizeClass,
          colors.bg,
          'shadow-sm',
          colors.glow
        )}
      />
    </span>
  )
}
