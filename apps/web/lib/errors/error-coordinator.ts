/**
 * Error Coordination System
 *
 * Centralizes error handling across all mutation hooks to:
 * - Standardize user-facing error messages
 * - Reduce code duplication
 * - Enable consistent error logging/reporting
 * - Coordinate retry logic
 */

import { toast } from 'sonner'

/**
 * Categorized error types for better error handling
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTH = 'AUTH',
  TRANSACTION = 'TRANSACTION',
  PERMISSION = 'PERMISSION',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Error metadata for logging and analytics
 */
export interface ErrorMetadata {
  errorType: ErrorType
  operation: string
  timestamp: number
  userId?: string
  agentAddress?: string
  transactionSignature?: string
  retryable: boolean
  userMessage: string
  technicalMessage: string
  originalError?: Error
}

/**
 * Error coordinator configuration
 */
export interface ErrorCoordinatorConfig {
  /** Whether to show toast notifications */
  showToast?: boolean
  /** Whether to log to console */
  logToConsole?: boolean
  /** Whether to report to external service (e.g., Sentry) */
  reportToService?: boolean
  /** Custom error reporter */
  customReporter?: (metadata: ErrorMetadata) => void
}

/**
 * Classifies an error into a specific error type
 */
function classifyError(error: unknown): ErrorType {
  if (!error) return ErrorType.UNKNOWN

  const errorMessage =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection')
  ) {
    return ErrorType.NETWORK
  }

  // Authentication errors
  if (
    errorMessage.includes('auth') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('unauthenticated') ||
    errorMessage.includes('wallet not connected')
  ) {
    return ErrorType.AUTH
  }

  // Validation errors
  if (
    errorMessage.includes('invalid') ||
    errorMessage.includes('validation') ||
    errorMessage.includes('required') ||
    errorMessage.includes('must be')
  ) {
    return ErrorType.VALIDATION
  }

  // Transaction errors
  if (
    errorMessage.includes('transaction') ||
    errorMessage.includes('insufficient') ||
    errorMessage.includes('signature') ||
    errorMessage.includes('blockhash')
  ) {
    return ErrorType.TRANSACTION
  }

  // Permission errors
  if (
    errorMessage.includes('permission') ||
    errorMessage.includes('forbidden') ||
    errorMessage.includes('not allowed')
  ) {
    return ErrorType.PERMISSION
  }

  // Not found errors
  if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
    return ErrorType.NOT_FOUND
  }

  // Rate limit errors
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return ErrorType.RATE_LIMIT
  }

  return ErrorType.UNKNOWN
}

/**
 * Determines if an error is retryable based on its type
 */
function isRetryable(errorType: ErrorType): boolean {
  switch (errorType) {
    case ErrorType.NETWORK:
    case ErrorType.RATE_LIMIT:
    case ErrorType.TRANSACTION: // Some transaction errors are retryable (e.g., blockhash expired)
      return true
    case ErrorType.VALIDATION:
    case ErrorType.AUTH:
    case ErrorType.PERMISSION:
    case ErrorType.NOT_FOUND:
    case ErrorType.UNKNOWN:
      return false
    default:
      return false
  }
}

/**
 * Gets user-friendly error message based on error type and operation
 */
function getUserMessage(errorType: ErrorType, operation: string, error: unknown): string {
  const defaultMessages: Record<ErrorType, string> = {
    [ErrorType.NETWORK]: `Network error during ${operation}. Please check your connection and try again.`,
    [ErrorType.VALIDATION]: `Invalid input for ${operation}. Please check your data and try again.`,
    [ErrorType.AUTH]: `Authentication required for ${operation}. Please connect your wallet.`,
    [ErrorType.TRANSACTION]: `Transaction failed for ${operation}. Please try again.`,
    [ErrorType.PERMISSION]: `You don't have permission to ${operation}.`,
    [ErrorType.NOT_FOUND]: `Resource not found for ${operation}.`,
    [ErrorType.RATE_LIMIT]: `Too many requests for ${operation}. Please wait a moment and try again.`,
    [ErrorType.UNKNOWN]: `An error occurred during ${operation}. Please try again.`,
  }

  // Check if error has a user-friendly message
  if (error instanceof Error && error.message && error.message.length < 100) {
    return error.message
  }

  return defaultMessages[errorType]
}

/**
 * Main error coordination function
 *
 * @param error - The error that occurred
 * @param operation - Human-readable operation name (e.g., "agent registration", "staking tokens")
 * @param config - Optional configuration for error handling
 * @returns Error metadata for further processing
 */
export function coordinateError(
  error: unknown,
  operation: string,
  config: ErrorCoordinatorConfig = {}
): ErrorMetadata {
  const { showToast = true, logToConsole = true, reportToService = false, customReporter } = config

  // Classify the error
  const errorType = classifyError(error)

  // Build error metadata
  const metadata: ErrorMetadata = {
    errorType,
    operation,
    timestamp: Date.now(),
    retryable: isRetryable(errorType),
    userMessage: getUserMessage(errorType, operation, error),
    technicalMessage: error instanceof Error ? error.message : String(error),
    originalError: error instanceof Error ? error : undefined,
  }

  // Log to console if enabled
  if (logToConsole) {
    console.error(`[Error Coordinator] ${operation}:`, {
      type: errorType,
      retryable: metadata.retryable,
      message: metadata.technicalMessage,
      error,
    })
  }

  // Show toast notification if enabled
  if (showToast) {
    toast.error(metadata.userMessage, {
      description: metadata.retryable ? 'You can try again.' : undefined,
    })
  }

  // Report to external service if enabled
  if (reportToService) {
    // TODO: Integrate with error reporting service (e.g., Sentry)
    // Sentry.captureException(error, { contexts: { metadata } })
  }

  // Custom reporter
  if (customReporter) {
    customReporter(metadata)
  }

  return metadata
}

/**
 * Helper for mutation error handling
 *
 * Returns a standardized onError handler for TanStack Query mutations
 *
 * @param operation - Human-readable operation name
 * @param config - Optional error coordinator configuration
 */
export function createMutationErrorHandler(operation: string, config?: ErrorCoordinatorConfig) {
  return (error: unknown) => {
    coordinateError(error, operation, config)
  }
}

/**
 * Helper for query error handling
 *
 * Returns a standardized error handler for TanStack Query queries
 *
 * @param operation - Human-readable operation name
 * @param config - Optional error coordinator configuration
 */
export function createQueryErrorHandler(operation: string, config?: ErrorCoordinatorConfig) {
  return (error: unknown) => {
    coordinateError(error, operation, {
      ...config,
      showToast: config?.showToast ?? false, // Don't show toast for query errors by default
    })
  }
}
