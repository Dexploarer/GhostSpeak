/**
 * useApiRequest - Generic hook for API requests with loading/error/success states
 *
 * Usage:
 * ```tsx
 * const { execute, isLoading, error, data } = useApiRequest<Agent>()
 *
 * const handleSubmit = async () => {
 *   await execute('/api/v1/agent/register', {
 *     method: 'POST',
 *     body: JSON.stringify(formData)
 *   })
 * }
 * ```
 */

import { useState, useCallback } from 'react'

interface UseApiRequestOptions {
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
}

export function useApiRequest<T = any>(options?: UseApiRequestOptions) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const execute = useCallback(
    async (url: string, init?: RequestInit) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(url, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()
        setData(result)
        options?.onSuccess?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        options?.onError?.(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [options]
  )

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    execute,
    reset,
    data,
    error,
    isLoading,
    isSuccess: !isLoading && !error && data !== null,
  }
}
