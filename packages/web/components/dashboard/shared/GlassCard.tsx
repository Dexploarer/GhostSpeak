import React from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'interactive'
  intensity?: 'low' | 'medium' | 'high'
}

export function GlassCard({
  children,
  className,
  variant = 'default',
  intensity = 'medium',
  ...props
}: GlassCardProps) {
  const baseStyles = 'rounded-2xl border border-white/10 backdrop-blur-xl transition-all duration-300'
  
  const intensityStyles = {
    low: 'bg-gray-900/40',
    medium: 'bg-gray-900/60',
    high: 'bg-gray-900/80',
  }

  const variantStyles = {
    default: '',
    hover: 'hover:bg-gray-800/60 hover:border-white/20 hover:shadow-lg hover:shadow-purple-500/10',
    interactive: 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:bg-gray-800/60 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/20',
  }

  return (
    <div
      className={cn(
        baseStyles,
        intensityStyles[intensity],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
