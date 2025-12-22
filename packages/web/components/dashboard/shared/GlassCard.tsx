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
        // Theme focused
        'bg-card/30 border-border',
        // Variant-specific styles
        variant === 'hover' && [
          'transition-all duration-300',
          'hover:bg-card/50 hover:border-primary/50',
          'hover:shadow-lg hover:shadow-primary/5',
          'cursor-pointer'
        ],
        variant === 'static' && [
          'bg-card/20 border-border/50'
        ],
        variant === 'interactive' && [
          'transition-all duration-300',
          'hover:bg-card/50 hover:border-primary/50',
          'hover:shadow-lg hover:shadow-primary/10',
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
