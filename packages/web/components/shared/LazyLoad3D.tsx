'use client'

/**
 * Lazy Load 3D Component Wrapper
 *
 * Optimizes bundle size by lazy-loading heavy 3D components (Three.js, R3F).
 * Only loads the component when it enters the viewport.
 *
 * Benefits:
 * - Faster initial page load
 * - Smaller initial bundle
 * - Better performance on low-end devices
 */

import React, { lazy, Suspense, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface LazyLoad3DProps {
  /** Component to lazy load - must be a dynamic import */
  component: () => Promise<{ default: React.ComponentType<any> }>
  /** Props to pass to the lazy-loaded component */
  componentProps?: Record<string, any>
  /** Loading fallback */
  fallback?: React.ReactNode
  /** CSS classes for wrapper */
  className?: string
  /** Enable intersection observer for viewport-based loading */
  loadOnView?: boolean
}

/**
 * Default loading fallback for 3D components
 */
function Default3DFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg',
        className
      )}
    >
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Loading 3D scene...</p>
      </div>
    </div>
  )
}

/**
 * LazyLoad3D Component
 *
 * Wraps heavy 3D components with lazy loading and viewport detection.
 *
 * @example
 * <LazyLoad3D
 *   component={() => import('./AgentSwarm3D')}
 *   loadOnView
 *   className="h-[400px]"
 * />
 */
export function LazyLoad3D({
  component,
  componentProps = {},
  fallback,
  className,
  loadOnView = true,
}: LazyLoad3DProps) {
  const [shouldLoad, setShouldLoad] = useState(!loadOnView)
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null)

  // Intersection observer for viewport-based loading
  useEffect(() => {
    if (!loadOnView || shouldLoad || !containerRef) return

    // Ensure containerRef is a valid DOM Node before observing
    if (!(containerRef instanceof Node)) {
      console.warn('LazyLoad3D: containerRef is not a valid DOM Node')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '100px', // Start loading slightly before entering viewport
        threshold: 0.1,
      }
    )

    observer.observe(containerRef)

    return () => observer.disconnect()
  }, [loadOnView, shouldLoad, containerRef])

  // Lazy load the component
  const LazyComponent = shouldLoad ? lazy(component) : null

  return (
    <div ref={setContainerRef} className={cn('relative', className)}>
      {!shouldLoad ? (
        fallback || <Default3DFallback className={className} />
      ) : (
        <Suspense fallback={fallback || <Default3DFallback className={className} />}>
          {LazyComponent && <LazyComponent {...componentProps} />}
        </Suspense>
      )}
    </div>
  )
}

/**
 * Prebuilt lazy loaders for common 3D components
 */

export function LazyAgentSwarm3D({ className, ...props }: any) {
  return (
    <LazyLoad3D
      component={async () => {
        const mod = await import('@/components/landing/3d/AgentSwarm3D')
        return { default: mod.AgentSwarm3D }
      }}
      componentProps={props}
      className={className}
      loadOnView
    />
  )
}

export function LazyCostVisualizer3D({ className, ...props }: any) {
  return (
    <LazyLoad3D
      component={async () => {
        const mod = await import('@/components/landing/3d/CostVisualizer3D')
        return { default: mod.CostVisualizer3D }
      }}
      componentProps={props}
      className={className}
      loadOnView
    />
  )
}

export function LazyGhostMascot3D({ className, ...props }: any) {
  return (
    <LazyLoad3D
      component={async () => {
        const mod = await import('@/components/landing/3d/GhostMascot3D')
        return { default: mod.GhostMascot3D }
      }}
      componentProps={props}
      className={className}
      loadOnView
    />
  )
}
