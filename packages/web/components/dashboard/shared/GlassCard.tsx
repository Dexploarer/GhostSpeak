'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'static' | 'interactive'
  children?: React.ReactNode
}

export function GlassCard({ 
  variant = 'default', 
  className, 
  children, 
  ...props 
}: GlassCardProps) {
  return (
    <div
      className={cn(
        // Base glassmorphism styles
        'relative rounded-2xl border backdrop-blur-xl overflow-hidden',
        // Dark theme focused
        'bg-white/5 border-white/10',
        // Variant-specific styles
        variant === 'hover' && [
          'transition-all duration-300',
          'hover:bg-white/8 hover:border-white/20',
          'hover:shadow-lg hover:shadow-black/20',
          'cursor-pointer'
        ],
        variant === 'static' && [
          'bg-white/3 border-white/5'
        ],
        variant === 'interactive' && [
          'transition-all duration-300',
          'hover:bg-white/10 hover:border-purple-500/50',
          'hover:shadow-lg hover:shadow-purple-500/10',
          'cursor-pointer active:scale-[0.98]'
        ],
        className
      )}
      {...props}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
