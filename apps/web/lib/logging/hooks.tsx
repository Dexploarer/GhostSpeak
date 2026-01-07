/**
 * React Hooks and Utilities for Wide Event Enrichment
 *
 * Provides hooks and utilities to enrich wide events with business context
 * throughout the React component lifecycle.
 */

'use client'

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { getWideEventLogger, WideEvent, WideEventLogger } from './wide-event'

export type UseWideEventOptions = {
  path: string
  method: string
  userId?: string
  walletAddress?: string
}

/**
 * Hook to manage the lifecycle of a wide event in a client component
 */
export function useWideEventState(options: UseWideEventOptions) {
  const [event, setEvent] = useState<WideEvent | null>(null)
  const logger = getWideEventLogger()

  const createEvent = useCallback(() => {
    const newEvent = logger.createEvent({
      method: options.method,
      path: options.path,
      userId: options.userId,
      walletAddress: options.walletAddress,
    })
    setEvent(newEvent)
    return newEvent
  }, [logger, options.method, options.path, options.userId, options.walletAddress])

  const enrich = useCallback((enrichment: Partial<WideEvent>) => {
    setEvent((prev) => (prev ? { ...prev, ...enrichment } : null))
  }, [])

  return {
    event,
    createEvent,
    enrich,
  }
}

// Extend Window interface for request context
declare global {
  interface Window {
    __wideEvent?: WideEvent
  }
}

/**
 * Hook to get the current wide event from window context
 */
export function useWideEvent() {
  if (typeof window !== 'undefined') {
    return window.__wideEvent
  }
  return undefined
}

/**
 * Hook to enrich wide events with user context
 */
export function useWideEventUserEnrichment() {
  const { publicKey } = useWallet()
  const logger = getWideEventLogger()

  // Get user data from Convex
  const userData = useQuery(
    api.dashboard.getUserDashboard,
    publicKey ? { walletAddress: publicKey } : 'skip'
  )

  useEffect(() => {
    // Enrichment with user context
    if (typeof window !== 'undefined' && window.__wideEvent && userData) {
      enrichWideEvent(window.__wideEvent, {
        user: {
          subscription_tier: (userData as any).subscriptionTier,
          account_age_days: (userData as any).accountAgeDays,
          lifetime_value_cents: (userData as any).lifetimeValueCents,
        },
      })
    }
  }, [userData])

  return (userData as any)?.user
}

/**
 * Hook to enrich wide events with feature flags
 */
export function useWideEventFeatureEnrichment(featureFlags: Record<string, boolean | string>) {
  const logger = getWideEventLogger()

  useEffect(() => {
    if (typeof window !== 'undefined' && window.__wideEvent) {
      logger.enrichWithBusiness(window.__wideEvent, {
        feature_flags: featureFlags,
      })
    }
  }, [featureFlags, logger])
}

/**
 * Hook to enrich wide events with performance metrics
 */
export function useWideEventPerformanceEnrichment() {
  const logger = getWideEventLogger()
  const performanceRef = useRef({
    componentMountTime: Date.now(),
    renderCount: 0,
  })

  useEffect(() => {
    performanceRef.current.renderCount++

    if (typeof window !== 'undefined' && window.__wideEvent) {
      logger.enrichWithBusiness(window.__wideEvent, {
        metadata: {
          component_mount_time: performanceRef.current.componentMountTime,
          render_count: performanceRef.current.renderCount,
        },
      })
    }
  })

  return performanceRef.current
}

/**
 * Hook to enrich wide events with agent context
 */
export function useWideEventAgentEnrichment(agentAddress?: string) {
  const logger = getWideEventLogger()

  // Get agent data from Convex
  const agentData = useQuery(
    api.ghostDiscovery.getDiscoveredAgent,
    agentAddress ? { ghostAddress: agentAddress } : 'skip'
  )

  // Get reputation data
  const reputationData = useQuery(
    api.ghostScoreCalculator.calculateAgentScore,
    agentAddress ? { agentAddress } : 'skip'
  )

  useEffect(() => {
    if (typeof window !== 'undefined' && window.__wideEvent && agentData) {
      logger.enrichWithBusiness(window.__wideEvent, {
        agent: {
          address: agentAddress,
          name: (agentData as any).name,
          status: (agentData as any).status,
          tier: reputationData?.tier,
          reputation_score: reputationData?.score,
        },
      })
    }
  }, [agentData, reputationData, agentAddress, logger])

  return { agentData, reputationData }
}

/**
 * Hook to enrich wide events with cart/payment context (for marketplace)
 */
export function useWideEventBusinessEnrichment(journey: string, feature: string, intent?: string) {
  const wideEvent = useWideEvent()

  useEffect(() => {
    if (wideEvent) {
      enrichWideEvent(wideEvent, {
        business: {
          business: {
            user_journey: journey,
            feature_used: feature,
            user_intent: intent,
          },
        },
        metadata: {
          conversion_step: 1, // Will be updated as user progresses
        },
      })
    }
  }, [wideEvent, journey, feature, intent])
}

export function useWideEventFrontendMetrics() {
  const wideEvent = useWideEvent()

  useEffect(() => {
    if (wideEvent && typeof window !== 'undefined') {
      // Capture frontend context
      const frontendContext = {
        user_agent: navigator.userAgent,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        page_load_time_ms: performance.timing.loadEventEnd - performance.timing.navigationStart,
        dom_ready_time_ms:
          performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      }

      enrichWideEvent(wideEvent, { frontend: frontendContext })

      // Capture Web Vitals
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            enrichWideEvent(wideEvent, {
              performance: {
                largest_contentful_paint_ms: entry.startTime,
              },
            })
          }
          if (entry.entryType === 'first-input') {
            enrichWideEvent(wideEvent, {
              performance: {
                first_input_delay_ms: (entry as any).processingStart - entry.startTime,
              },
            })
          }
          if (entry.entryType === 'layout-shift') {
            enrichWideEvent(wideEvent, {
              performance: {
                cumulative_layout_shift: (entry as any).value,
              },
            })
          }
        }
      })

      observer.observe({
        entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'],
        buffered: true,
      } as any)

      return () => observer.disconnect()
    }
  }, [wideEvent])
}

export function useWideEventComponentTracking(componentName: string) {
  const wideEvent = useWideEvent()
  const renderStartTime = useRef<number | undefined>(undefined)

  useEffect(() => {
    renderStartTime.current = performance.now()
  })

  useEffect(() => {
    if (wideEvent && renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current

      enrichWideEvent(wideEvent, {
        frontend: {
          component_name: componentName,
          react_render_time_ms: renderTime,
        },
      })
    }
  })
}

export function useWideEventUserInteraction(interactionType: string, elementId?: string) {
  const wideEvent = useWideEvent()

  const trackInteraction = useCallback(
    (details?: any) => {
      if (wideEvent) {
        enrichWideEvent(wideEvent, {
          frontend: {
            user_interaction: interactionType,
            component_name: elementId,
          },
          metadata: {
            interaction_details: details,
          },
        })

        // Emit interaction event
        getWideEventLogger().emit({
          ...wideEvent,
          metadata: {
            ...wideEvent.metadata,
            interaction_event: true,
            interaction_type: interactionType,
          },
        })
      }
    },
    [wideEvent, interactionType, elementId]
  )

  return trackInteraction
}

export function useWideEventCommerceEnrichment(cartId?: string) {
  const logger = getWideEventLogger()

  // This would be extended based on your commerce implementation
  useEffect(() => {
    if (typeof window !== 'undefined' && window.__wideEvent && cartId) {
      logger.enrichWithBusiness(window.__wideEvent, {
        cart: {
          id: cartId,
          // Add more cart context as needed
        },
      })
    }
  }, [cartId, logger])
}

/**
 * Utility to enrich wide events from server components/API routes
 */
export function enrichWideEvent(
  event: WideEvent,
  context: {
    user?: Parameters<WideEventLogger['enrichWithUser']>[1]
    business?: Parameters<WideEventLogger['enrichWithBusiness']>[1]
    frontend?: WideEvent['frontend']
    performance?: WideEvent['performance']
    metadata?: WideEvent['metadata']
  }
) {
  const logger = getWideEventLogger()

  if (context.user) {
    logger.enrichWithUser(event, context.user)
  }

  if (context.business || context.frontend || context.performance || context.metadata) {
    logger.enrichWithBusiness(event, {
      ...context.business,
      feature_flags: (context.business as any)?.feature_flags,
      performance: context.performance,
      metadata: context.metadata,
      // Handle frontend context which is nested in business enricher for some reason in the logger
      ...(context.frontend ? { metadata: { ...context.metadata, ...context.frontend } } : {}),
    } as any)
  }
}

/**
 * Utility to complete and emit a wide event
 */
export function completeWideEvent(
  event: WideEvent,
  result: {
    statusCode?: number
    durationMs?: number
    error?: Error | { type: string; code?: string; message: string; retriable?: boolean }
  }
) {
  const logger = getWideEventLogger()
  logger.completeEvent(event, result)
  logger.emit(event)
}

/**
 * Higher-order component to add wide event enrichment
 */
export function withWideEventEnrichment<P extends object>(
  Component: React.ComponentType<P>,
  enrichmentFn?: (props: P) => Parameters<WideEventLogger['enrichWithBusiness']>[1]
) {
  return function WideEventEnrichedComponent(props: P) {
    const logger = getWideEventLogger()

    useEffect(() => {
      if (typeof window !== 'undefined' && window.__wideEvent && enrichmentFn) {
        const businessContext = enrichmentFn(props)
        logger.enrichWithBusiness(window.__wideEvent, businessContext)
      }
    }, [props, logger])

    return <Component {...props} />
  }
}

/**
 * Error boundary that enriches wide events with error context
 */
export class WideEventErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: {
    children: React.ReactNode
    fallback?: React.ComponentType<{ error: Error }>
  }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const logger = getWideEventLogger()

    if (typeof window !== 'undefined' && window.__wideEvent) {
      logger.enrichWithBusiness(window.__wideEvent, {
        error: {
          type: 'ReactError',
          code: 'REACT_ERROR_BOUNDARY',
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        metadata: {
          error_boundary: true,
          component_stack: errorInfo.componentStack,
        },
      })

      // Emit error event
      logger.emit(window.__wideEvent)
    }

    // Also log to console for immediate debugging
    console.error('React Error Boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} />
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground">
              An error occurred while rendering this component.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="cursor-pointer">Error Details</summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                  {this.state.error.message}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
