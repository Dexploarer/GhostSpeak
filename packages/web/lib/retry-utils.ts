/**
 * Retry Utilities
 *
 * Provides exponential backoff retry logic for failed operations.
 */

export interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  onRetry?: (error: Error, attempt: number) => void
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  onRetry: () => {},
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  let lastError: Error | undefined

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry if this was the last attempt
      if (attempt === opts.maxRetries) {
        break
      }

      // Call retry callback
      opts.onRetry(lastError, attempt + 1)

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelayMs
      )

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Retry with fallback strategy
 *
 * Try multiple strategies in sequence until one succeeds
 */
export async function retryWithFallback<T>(
  strategies: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<T> {
  let lastError: Error | undefined

  for (let i = 0; i < strategies.length; i++) {
    try {
      return await retryWithBackoff(strategies[i], options)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      console.warn(`[Retry] Strategy ${i + 1}/${strategies.length} failed:`, lastError.message)

      // Continue to next strategy
    }
  }

  throw lastError || new Error('All retry strategies failed')
}

/**
 * Batch retry queue processor
 *
 * Process a queue of failed items with retry logic
 */
export class RetryQueue<T> {
  private queue: Array<{ item: T; attempts: number }> = []
  private processing = false

  constructor(
    private processor: (item: T) => Promise<void>,
    private options: RetryOptions = {}
  ) {}

  /**
   * Add item to retry queue
   */
  add(item: T): void {
    this.queue.push({ item, attempts: 0 })
  }

  /**
   * Process all items in queue
   */
  async processAll(): Promise<{ succeeded: number; failed: number }> {
    if (this.processing) {
      throw new Error('Already processing queue')
    }

    this.processing = true

    let succeeded = 0
    let failed = 0

    while (this.queue.length > 0) {
      const entry = this.queue.shift()
      if (!entry) break

      try {
        await retryWithBackoff(() => this.processor(entry.item), this.options)
        succeeded++
      } catch (error) {
        failed++

        // Re-add to queue if max retries not reached
        entry.attempts++
        const maxRetries = this.options.maxRetries ?? DEFAULT_OPTIONS.maxRetries

        if (entry.attempts < maxRetries) {
          this.queue.push(entry)
        } else {
          console.error('[RetryQueue] Max retries reached for item:', entry.item)
        }
      }
    }

    this.processing = false

    return { succeeded, failed }
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = []
  }
}
