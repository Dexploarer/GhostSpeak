'use client'

import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlowCardProps {
  children: ReactNode
  className?: string
  glowColor?: 'primary' | 'white' | 'custom'
  customGlowColor?: string
  glowIntensity?: 'low' | 'medium' | 'high'
  hoverOnly?: boolean
  animated?: boolean
}

/**
 * GlowCard - Premium radial glow effect component
 *
 * Wraps content with a customizable radial glow effect that can be:
 * - Hover-triggered or always visible
 * - Animated with pulse effect
 * - Customized in color and intensity
 *
 * @param glowColor - Preset color: 'primary' (lime), 'white', or 'custom'
 * @param customGlowColor - RGB values as string "r, g, b" when glowColor is 'custom'
 * @param glowIntensity - Opacity level: 'low' (0.15), 'medium' (0.3), 'high' (0.5)
 * @param hoverOnly - If true, glow only appears on hover (default: true)
 * @param animated - If true, adds pulsing animation (default: false)
 *
 * @example
 * <GlowCard glowColor="primary" glowIntensity="medium" hoverOnly>
 *   <div>Your content here</div>
 * </GlowCard>
 */
export function GlowCard({
  children,
  className,
  glowColor = 'primary',
  customGlowColor,
  glowIntensity = 'medium',
  hoverOnly = true,
  animated = false,
}: GlowCardProps) {
  const getGlowStyle = (): React.CSSProperties => {
    const intensityMap = {
      low: 0.15,
      medium: 0.3,
      high: 0.5,
    }

    const intensity = intensityMap[glowIntensity]
    const fadeIntensity = intensity * 0.3

    let baseColor: string

    if (glowColor === 'white') {
      baseColor = `255, 255, 255`
    } else if (glowColor === 'custom' && customGlowColor) {
      // Expect customGlowColor in format "r, g, b"
      baseColor = customGlowColor
    } else {
      baseColor = `var(--primary-rgb)`
    }

    return {
      background: `radial-gradient(circle at center, rgba(${baseColor}, ${intensity}) 0%, rgba(${baseColor}, ${fadeIntensity}) 40%, transparent 70%)`,
    }
  }

  return (
    <div className={cn('relative group', className)}>
      {/* Glow Effect */}
      <div
        className={cn(
          'absolute inset-0 -m-8 md:-m-12 rounded-full pointer-events-none z-0 transition-opacity duration-500',
          hoverOnly ? 'opacity-0 group-hover:opacity-100' : 'opacity-100',
          animated && 'animate-pulse-glow'
        )}
        style={getGlowStyle()}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
