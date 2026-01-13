/**
 * Helper utilities for API operations
 *
 * These utilities reduce code duplication in components that make API calls.
 *
 * @module lib/api-helpers
 */

/**
 * Generic helper for API calls with loading and error handling
 *
 * @param fetchFn - Async function that performs the API call
 * @param onSuccess - Callback when API call succeeds
 * @param onError - Callback when API call fails
 * @param onFinally - Callback that runs after completion (regardless of success/failure)
 * @returns Promise that resolves when complete
 *
 * @example
 * ```typescript
 * await handleApiCall(
 *   async () => await apiClient.getAgentScore(address),
 *   (data) => setResult(data),
 *   (error) => setError(error),
 *   () => setLoading(false)
 * )
 * ```
 */
export async function handleApiCall<T>(
  fetchFn: () => Promise<T>,
  onSuccess: (data: T) => void,
  onError: (error: string) => void,
  onFinally?: () => void
): Promise<void> {
  try {
    const data = await fetchFn()
    onSuccess(data)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    onError(errorMessage)
  } finally {
    onFinally?.()
  }
}

/**
 * Generic state management helper for API calls
 *
 * @param fetchFn - Async function that performs the API call
 * @param setData - State setter for successful data
 * @param setError - State setter for error message
 * @param setLoading - State setter for loading state
 * @returns Promise that resolves when complete
 *
 * @example
 * ```typescript
 * await fetchWithState(
 *   async () => await apiClient.getUserQuota(userId),
 *   setQuota,
 *   setError,
 *   setLoading
 * )
 * ```
 */
export async function fetchWithState<T>(
  fetchFn: () => Promise<T>,
  setData: (data: T) => void,
  setError: (error: string | null) => void,
  setLoading: (loading: boolean) => void
): Promise<void> {
  setLoading(true)
  setError(null)

  await handleApiCall(
    fetchFn,
    setData,
    setError,
    () => setLoading(false)
  )
}

/**
 * Debounce function to limit API call rate
 *
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 *
 * @example
 * ```typescript
 * const debouncedSearch = debounce((query: string) => {
 *   apiClient.search(query)
 * }, 300)
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>

  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
}
