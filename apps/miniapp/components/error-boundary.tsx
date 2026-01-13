/**
 * React Error Boundary Component
 *
 * Catches React errors and displays user-friendly error messages.
 * Provides different error displays for development vs production.
 *
 * @module components/error-boundary
 */

'use client'

import React, { Component, type ReactNode, type ErrorInfo } from 'react'
import { isDevelopment } from '@/lib/env'
import { ApiError, NetworkError, TimeoutError } from '@/lib/types'

// ============================================================================
// Types
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode
  /**
   * Optional fallback component to render on error
   */
  fallback?: (error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode
  /**
   * Optional callback when error is caught
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

// ============================================================================
// Error Boundary Component
// ============================================================================

/**
 * Error Boundary Component
 *
 * Catches errors in child components and displays a fallback UI.
 * Includes retry functionality and displays different messages
 * for development vs production.
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 *
 * @example With custom fallback
 * ```tsx
 * <ErrorBoundary fallback={(error, errorInfo, retry) => (
 *   <div>
 *     <h1>Custom Error UI</h1>
 *     <button onClick={retry}>Try Again</button>
 *   </div>
 * )}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  /**
   * Static method called when error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  /**
   * Lifecycle method called after error is caught
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console (always)
    console.error('Error caught by ErrorBoundary:', error)
    console.error('Error info:', errorInfo)

    // Store error info in state
    this.setState({
      errorInfo,
    })

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  /**
   * Reset error boundary state (allows retry)
   */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  /**
   * Render error UI
   */
  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state
    const { children, fallback } = this.props

    // No error - render children normally
    if (!hasError || !error) {
      return children
    }

    // Use custom fallback if provided
    if (fallback && errorInfo) {
      return fallback(error, errorInfo, this.handleReset)
    }

    // Default error UI
    return (
      <DefaultErrorUI error={error} errorInfo={errorInfo} onRetry={this.handleReset} />
    )
  }
}

// ============================================================================
// Default Error UI
// ============================================================================

interface DefaultErrorUIProps {
  error: Error
  errorInfo: ErrorInfo | null
  onRetry: () => void
}

/**
 * Default error UI component
 *
 * Displays user-friendly error messages with retry button.
 * Shows detailed error info in development mode.
 */
function DefaultErrorUI({ error, errorInfo, onRetry }: DefaultErrorUIProps): React.ReactElement {
  // Get user-friendly error message
  const userMessage = getUserFriendlyErrorMessage(error)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
      <div className="w-full max-w-md rounded-lg border border-red-500/20 bg-gray-900/80 p-6 shadow-xl backdrop-blur-sm">
        {/* Error Icon */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Error Title */}
        <h1 className="mb-2 text-center text-xl font-bold text-white">Something went wrong</h1>

        {/* User-friendly message */}
        <p className="mb-4 text-center text-sm text-gray-300">{userMessage}</p>

        {/* Development-only details */}
        {isDevelopment && (
          <details className="mb-4 rounded border border-red-500/20 bg-black/20 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-red-400">
              Error Details (Dev Only)
            </summary>
            <div className="mt-2 space-y-2 text-xs">
              <div>
                <span className="font-semibold text-gray-400">Error Type:</span>
                <span className="ml-2 text-gray-300">{error.name}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-400">Message:</span>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words rounded bg-black/40 p-2 text-gray-300">
                  {error.message}
                </pre>
              </div>
              {error.stack && (
                <div>
                  <span className="font-semibold text-gray-400">Stack Trace:</span>
                  <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded bg-black/40 p-2 text-xs text-gray-400">
                    {error.stack}
                  </pre>
                </div>
              )}
              {errorInfo?.componentStack && (
                <div>
                  <span className="font-semibold text-gray-400">Component Stack:</span>
                  <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded bg-black/40 p-2 text-xs text-gray-400">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        {/* Retry Button */}
        <button
          onClick={onRetry}
          className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 font-semibold text-white transition-all hover:from-purple-700 hover:to-blue-700 active:scale-95"
        >
          Try Again
        </button>

        {/* Help Text */}
        <p className="mt-4 text-center text-xs text-gray-500">
          If this error persists, please contact support
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Error Message Helpers
// ============================================================================

/**
 * Get user-friendly error message based on error type
 *
 * @param error - The error object
 * @returns Human-readable error message
 */
function getUserFriendlyErrorMessage(error: Error): string {
  // API errors (4xx/5xx status codes)
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return 'The requested resource was not found. Please try again.'
    }
    if (error.status === 429) {
      return 'Too many requests. Please wait a moment and try again.'
    }
    if (error.status >= 500) {
      return 'Our servers are having issues. Please try again in a few moments.'
    }
    if (error.status >= 400) {
      return 'There was a problem with your request. Please check and try again.'
    }
    return error.message || 'An unexpected error occurred. Please try again.'
  }

  // Network errors (connection failed, DNS, etc.)
  if (error instanceof NetworkError) {
    return 'Unable to connect to the server. Please check your internet connection and try again.'
  }

  // Timeout errors
  if (error instanceof TimeoutError) {
    return 'The request took too long to complete. Please try again.'
  }

  // Generic errors
  if (isDevelopment) {
    // Show actual error message in development
    return error.message || 'An unexpected error occurred.'
  } else {
    // Generic message in production
    return 'An unexpected error occurred. Please try again.'
  }
}

// ============================================================================
// Exports
// ============================================================================

export default ErrorBoundary
