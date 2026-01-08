/**
 * Convex Integration for Wide Event Logging
 *
 * Provides utilities to enrich wide events with Convex operation context,
 * including database query performance, mutation results, and error handling.
 */

import { useMutation, useAction } from 'convex/react'
import { useEffect } from 'react'
import { getWideEventLogger, WideEvent } from './wide-event'

// Types for Convex operation context
export interface ConvexOperationContext {
  operationType: 'query' | 'mutation' | 'action'
  functionName: string
  args?: Record<string, unknown>
  startTime?: number
  endTime?: number
  resultCount?: number
  error?: Error
  cacheHit?: boolean
}

/**
 * Hook to enrich wide events with Convex query performance
 */
export function useConvexQueryEnrichment(
  query: unknown,
  functionName: string,
  args?: Record<string, unknown>
) {
  const logger = getWideEventLogger()

  useEffect(() => {
    if (typeof window !== 'undefined' && window.__wideEvent && query !== undefined) {
      const context: ConvexOperationContext = {
        operationType: 'query',
        functionName,
        args,
        cacheHit: query !== undefined, // Simple heuristic - if we have data immediately, it was cached
      }

      logger.enrichWithBusiness(window.__wideEvent, {
        performance: {
          convex_queries: (window.__wideEvent.performance?.convex_queries || 0) + 1,
        },
        metadata: {
          convex_operations: [
            ...((window.__wideEvent.metadata?.convex_operations as ConvexOperationContext[]) || []),
            context,
          ],
        },
      })
    }
  }, [query, functionName, args, logger])

  return query
}

/**
 * Hook to enrich wide events with Convex mutation results
 */
export function useConvexMutationEnrichment(
  mutation: ReturnType<typeof useMutation>,
  functionName: string
) {
  const logger = getWideEventLogger()

  useEffect(() => {
    if (typeof window !== 'undefined' && window.__wideEvent) {
      // Track mutation calls
      logger.enrichWithBusiness(window.__wideEvent, {
        metadata: {
          convex_mutations: [
            ...((window.__wideEvent.metadata?.convex_mutations as string[]) || []),
            functionName,
          ],
        },
      })
    }
  }, [functionName, logger])

  return mutation
}

/**
 * Hook to enrich wide events with Convex action results
 */
export function useConvexActionEnrichment(
  action: ReturnType<typeof useAction>,
  functionName: string
) {
  const logger = getWideEventLogger()

  useEffect(() => {
    if (typeof window !== 'undefined' && window.__wideEvent) {
      // Track action calls
      logger.enrichWithBusiness(window.__wideEvent, {
        metadata: {
          convex_actions: [
            ...((window.__wideEvent.metadata?.convex_actions as string[]) || []),
            functionName,
          ],
        },
      })
    }
  }, [functionName, logger])

  return action
}

/**
 * Higher-order function to wrap Convex mutations with wide event enrichment
 */
export function withWideEventMutation<T extends unknown[], R>(
  mutationFn: (...args: T) => Promise<R>,
  functionName: string,
  eventEnricher?: (args: T, result: R) => Partial<WideEvent>
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()
    const logger = getWideEventLogger()

    try {
      const result = await mutationFn(...args)

      // Enrich the current wide event with mutation context
      if (typeof window !== 'undefined' && window.__wideEvent) {
        const enrichment: Partial<WideEvent> = {
          performance: {
            database_queries: (window.__wideEvent.performance?.database_queries || 0) + 1,
          },
          metadata: {
            convex_operations: [
              ...((window.__wideEvent.metadata?.convex_operations as ConvexOperationContext[]) ||
                []),
              {
                operationType: 'mutation',
                functionName,
                args: args as Record<string, unknown>,
                startTime,
                endTime: Date.now(),
              },
            ],
          },
        }

        // Add custom enrichment if provided
        if (eventEnricher) {
          Object.assign(enrichment, eventEnricher(args, result))
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logger.enrichWithBusiness(window.__wideEvent, enrichment as any)
      }

      return result
    } catch (error) {
      // Enrich with error context
      if (typeof window !== 'undefined' && window.__wideEvent) {
        logger.enrichWithBusiness(window.__wideEvent, {
          error: {
            type: 'ConvexMutationError',
            code: 'CONVEX_MUTATION_FAILED',
            message: error instanceof Error ? error.message : 'Convex mutation failed',
            retriable: true, // Mutations are typically retriable
          },
          metadata: {
            convex_operations: [
              ...((window.__wideEvent.metadata?.convex_operations as ConvexOperationContext[]) ||
                []),
              {
                operationType: 'mutation',
                functionName,
                args: args as Record<string, unknown>,
                startTime,
                error: error instanceof Error ? error : new Error(String(error)),
              },
            ],
          },
        })
      }

      throw error
    }
  }
}

/**
 * Higher-order function to wrap Convex actions with wide event enrichment
 */
export function withWideEventAction<T extends unknown[], R>(
  actionFn: (...args: T) => Promise<R>,
  functionName: string,
  eventEnricher?: (args: T, result: R) => Partial<WideEvent>
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()
    const logger = getWideEventLogger()

    try {
      const result = await actionFn(...args)

      // Enrich the current wide event with action context
      if (typeof window !== 'undefined' && window.__wideEvent) {
        const enrichment: Partial<WideEvent> = {
          performance: {
            external_api_calls: (window.__wideEvent.performance?.external_api_calls || 0) + 1,
          },
          metadata: {
            convex_operations: [
              ...((window.__wideEvent.metadata?.convex_operations as ConvexOperationContext[]) ||
                []),
              {
                operationType: 'action',
                functionName,
                args: args as Record<string, unknown>,
                startTime,
                endTime: Date.now(),
              },
            ],
          },
        }

        // Add custom enrichment if provided
        if (eventEnricher) {
          Object.assign(enrichment, eventEnricher(args, result))
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logger.enrichWithBusiness(window.__wideEvent, enrichment as any)
      }

      return result
    } catch (error) {
      // Enrich with error context
      if (typeof window !== 'undefined' && window.__wideEvent) {
        logger.enrichWithBusiness(window.__wideEvent, {
          error: {
            type: 'ConvexActionError',
            code: 'CONVEX_ACTION_FAILED',
            message: error instanceof Error ? error.message : 'Convex action failed',
            retriable: true, // Actions are typically retriable
          },
          metadata: {
            convex_operations: [
              ...((window.__wideEvent.metadata?.convex_operations as ConvexOperationContext[]) ||
                []),
              {
                operationType: 'action',
                functionName,
                args: args as Record<string, unknown>,
                startTime,
                error: error instanceof Error ? error : new Error(String(error)),
              },
            ],
          },
        })
      }

      throw error
    }
  }
}

/**
 * Utility to enrich wide events with agent-related Convex operations
 */
export function enrichWithAgentContext(event: WideEvent, agentAddress: string, operation: string) {
  const logger = getWideEventLogger()

  logger.enrichWithBusiness(event, {
    agent: {
      address: agentAddress,
    },
    metadata: {
      agent_operations: [
        ...((event.metadata?.agent_operations as string[]) || []),
        `${operation}:${agentAddress}`,
      ],
    },
  })
}

/**
 * Utility to enrich wide events with reputation calculation context
 */
export function enrichWithReputationContext(
  event: WideEvent,
  agentAddress: string,
  score?: number,
  tier?: string
) {
  const logger = getWideEventLogger()

  logger.enrichWithBusiness(event, {
    agent: {
      address: agentAddress,
      reputation_score: score,
      tier: tier,
    },
    metadata: {
      reputation_calculations: [
        ...((event.metadata?.reputation_calculations as any[]) || []),
        { agentAddress, score, tier, timestamp: Date.now() },
      ],
    },
  })
}

/**
 * Utility to enrich wide events with credential operations
 */
export function enrichWithCredentialContext(
  event: WideEvent,
  credentialType: string,
  agentAddress: string
) {
  const logger = getWideEventLogger()

  logger.enrichWithBusiness(event, {
    metadata: {
      credential_operations: [
        ...((event.metadata?.credential_operations as any[]) || []),
        { type: credentialType, agentAddress, timestamp: Date.now() },
      ],
    },
  })
}
