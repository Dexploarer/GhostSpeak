/**
 * Error Boundary Component
 * React error boundary for graceful error handling in CLI
 */

import React, { Component, type ReactNode } from 'react'
import { Box, Text } from 'ink'

export interface ErrorBoundaryProps {
  /**
   * Child components to wrap
   */
  children: ReactNode
  /**
   * Show error details (stack trace)
   * @default false (set true in dev mode)
   */
  showDetails?: boolean
  /**
   * Custom error message
   */
  errorMessage?: string
  /**
   * Enable retry mechanism
   * @default true
   */
  allowRetry?: boolean
  /**
   * Callback when error occurs
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /**
   * Callback when retry is triggered
   */
  onRetry?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    this.setState({
      error,
      errorInfo,
    })

    // Call error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })

    if (this.props.onRetry) {
      this.props.onRetry()
    }
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const { showDetails = false, errorMessage, allowRetry = true } = this.props
      const { error, errorInfo } = this.state

      return (
        <Box flexDirection="column" padding={1}>
          {/* Error header */}
          <Box marginBottom={1} borderStyle="round" borderColor="red" padding={1}>
            <Text>❌ </Text>
            <Text bold color="red">
              An Error Occurred
            </Text>
          </Box>

          {/* Error message */}
          <Box flexDirection="column" marginBottom={1}>
            <Text color="red">
              {errorMessage || error.message || 'Something went wrong'}
            </Text>
          </Box>

          {/* Error details (dev mode) */}
          {showDetails && (
            <Box flexDirection="column" marginBottom={1}>
              <Box marginBottom={1}>
                <Text bold dimColor>
                  Error Details:
                </Text>
              </Box>
              <Box flexDirection="column" paddingLeft={2}>
                <Text dimColor>{error.toString()}</Text>
                {error.stack && (
                  <Box marginTop={1} flexDirection="column">
                    <Text dimColor>Stack Trace:</Text>
                    <Text dimColor>{error.stack}</Text>
                  </Box>
                )}
                {errorInfo?.componentStack && (
                  <Box marginTop={1} flexDirection="column">
                    <Text dimColor>Component Stack:</Text>
                    <Text dimColor>{errorInfo.componentStack}</Text>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* Retry hint */}
          {allowRetry && (
            <Box>
              <Text dimColor>
                Press <Text color="yellow">R</Text> to retry or{' '}
                <Text color="yellow">Ctrl+C</Text> to exit
              </Text>
            </Box>
          )}

          {/* Help text */}
          <Box marginTop={1}>
            <Text dimColor>
              If this error persists, please report it to the GhostSpeak team.
            </Text>
          </Box>
        </Box>
      )
    }

    return this.props.children
  }
}
