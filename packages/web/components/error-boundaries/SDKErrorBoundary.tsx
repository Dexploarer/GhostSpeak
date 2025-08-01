'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

/**
 * SDK Error Boundary - Catches and handles GhostSpeak SDK errors gracefully
 *
 * Features:
 * - Catches SDK connection errors
 * - Catches wallet adapter errors
 * - Catches transaction signing errors
 * - Provides user-friendly error messages
 * - Includes retry mechanism
 * - Reports errors for debugging
 */
export class SDKErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: 0,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })

    // Log the error for debugging
    console.error('GhostSpeak SDK Error:', error)
    console.error('Error Info:', errorInfo)

    // Call optional error handler
    this.props.onError?.(error, errorInfo)

    // Show user-friendly toast notification
    this.showErrorToast(error)

    // Report error to monitoring service (if available)
    this.reportError(error, errorInfo)
  }

  private showErrorToast(error: Error) {
    const errorType = this.categorizeError(error)

    switch (errorType) {
      case 'WALLET_NOT_CONNECTED':
        toast.error('Wallet not connected', {
          description: 'Please connect your wallet to continue',
        })
        break
      case 'TRANSACTION_REJECTED':
        toast.error('Transaction rejected', {
          description: 'The transaction was rejected by your wallet',
        })
        break
      case 'NETWORK_ERROR':
        toast.error('Network error', {
          description: 'Unable to connect to the blockchain. Please check your connection.',
        })
        break
      case 'SDK_ERROR':
        toast.error('SDK error', {
          description: 'An error occurred with the GhostSpeak SDK. Please try again.',
        })
        break
      default:
        toast.error('Unexpected error', {
          description: 'Something went wrong. Please try again.',
        })
    }
  }

  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase()

    if (message.includes('wallet not connected') || message.includes('no wallet')) {
      return 'WALLET_NOT_CONNECTED'
    }

    if (message.includes('user rejected') || message.includes('transaction rejected')) {
      return 'TRANSACTION_REJECTED'
    }

    if (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('fetch')
    ) {
      return 'NETWORK_ERROR'
    }

    if (message.includes('ghostspeak') || message.includes('sdk')) {
      return 'SDK_ERROR'
    }

    return 'UNKNOWN'
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    // Here you would integrate with your error reporting service
    // e.g., Sentry, LogRocket, etc.

    const errorReport = {
      message: error.message,
      stack: error.stack,
      errorInfo: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }

    // For now, just log to console
    console.log('Error Report:', errorReport)

    // TODO: Send to error reporting service
    // errorReportingService.report(errorReport)
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState((prevState) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }))

      toast.info(`Retrying... (${this.state.retryCount + 1}/${this.maxRetries})`)
    } else {
      toast.error('Maximum retries reached. Please refresh the page.')
    }
  }

  private handleGoBack = () => {
    window.history.back()
  }

  private handleRefresh = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-xl font-semibold">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground text-center">
                {this.categorizeError(this.state.error || new Error('Unknown error')) ===
                'WALLET_NOT_CONNECTED'
                  ? 'Please connect your wallet to continue using GhostSpeak.'
                  : this.categorizeError(this.state.error || new Error('Unknown error')) ===
                      'NETWORK_ERROR'
                    ? 'Unable to connect to the blockchain. Please check your internet connection.'
                    : 'An unexpected error occurred while using the GhostSpeak protocol.'}
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                    {this.state.error.message}
                    {this.state.error.stack && `\n\n${this.state.error.stack}`}
                  </pre>
                </details>
              )}

              <div className="flex flex-col gap-2 pt-4">
                {this.state.retryCount < this.maxRetries && (
                  <Button onClick={this.handleRetry} className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                  </Button>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={this.handleGoBack} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go Back
                  </Button>
                  <Button variant="outline" onClick={this.handleRefresh} className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook version of the error boundary for functional components
 */
export function useSDKErrorHandler() {
  const handleError = React.useCallback((error: Error) => {
    console.error('SDK Error:', error)

    const errorType = error.message.toLowerCase()

    if (errorType.includes('wallet not connected')) {
      toast.error('Wallet not connected', {
        description: 'Please connect your wallet to continue',
      })
    } else if (errorType.includes('user rejected')) {
      toast.error('Transaction rejected', {
        description: 'The transaction was rejected by your wallet',
      })
    } else if (errorType.includes('network') || errorType.includes('connection')) {
      toast.error('Network error', {
        description: 'Unable to connect to the blockchain. Please try again.',
      })
    } else {
      toast.error('SDK error', {
        description: 'An error occurred with the GhostSpeak SDK. Please try again.',
      })
    }
  }, [])

  return { handleError }
}

export default SDKErrorBoundary
