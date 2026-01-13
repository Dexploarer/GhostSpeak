/**
 * useConvexQuery - Simplified wrapper for Convex queries with loading/error states
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, error } = useConvexQuery(api.agents.list, { limit: 10 })
 * ```
 */

import { useQuery } from 'convex/react'
import { FunctionReference, OptionalRestArgs } from 'convex/server'

export function useConvexQuery<Query extends FunctionReference<'query'>>(
  query: Query,
  ...args: OptionalRestArgs<Query>
) {
  const data = useQuery(query, ...args)
  const isLoading = data === undefined
  const error = data === null ? new Error('Query returned null') : null

  return {
    data,
    isLoading,
    error,
    isSuccess: !isLoading && !error,
  }
}
