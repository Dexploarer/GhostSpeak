'use client'

import React, { ReactNode } from 'react'
import { QueryErrorResetBoundary, useQueryErrorResetBoundary } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Wifi } from 'lucide-react'

interface QueryErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

/**
 * Query Error Fallback Component
 * Displays user-friendly error messages for React Query errors
 */
function QueryErrorFallback({ error, resetErrorBoundary }: QueryErrorFallbackProps) {
  const getErrorMessage = (error: Error) => {
    const message = error.message.toLowerCase()

    if (message.includes('agent') && message.includes('not found')) {
      return {
        title: 'Agent Not Found',
        description: 'The requested agent could not be found on the blockchain.',
        icon: AlertTriangle,
        suggestion: 'Please check the agent address and try again.',
      }
    }

    if (message.includes('escrow') && message.includes('not found')) {
      return {
        title: 'Escrow Not Found',
        description: 'The requested escrow could not be found on the blockchain.',
        icon: AlertTriangle,
        suggestion: 'Please verify the escrow address and try again.',
      }
    }

    if (message.includes('channel') && message.includes('not found')) {
      return {
        title: 'Channel Not Found',
        description: 'The requested channel could not be found.',
        icon: AlertTriangle,
        suggestion: 'The channel may have been deleted or made private.',
      }
    }

    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection')
    ) {
      return {
        title: 'Network Error',
        description: 'Unable to connect to the blockchain network.',
        icon: Wifi,
        suggestion: 'Please check your internet connection and try again.',
      }
    }

    if (message.includes('wallet') || message.includes('not connected')) {
      return {
        title: 'Wallet Error',
        description: 'There was an issue with your wallet connection.',
        icon: AlertTriangle,
        suggestion: 'Please reconnect your wallet and try again.',
      }
    }

    if (message.includes('unauthorized') || message.includes('permission')) {
      return {
        title: 'Permission Denied',
        description: 'You do not have permission to perform this action.',
        icon: AlertTriangle,
        suggestion: 'Please check your account permissions.',
      }
    }

    return {
      title: 'Query Failed',
      description: 'An error occurred while fetching data.',
      icon: AlertTriangle,
      suggestion: 'Please try again in a moment.',
    }
  }

  const errorInfo = getErrorMessage(error)
  const Icon = errorInfo.icon

  return (
    <div className="flex items-center justify-center p-8">
      <Card className="max-w-sm w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-lg font-semibold">{errorInfo.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">{errorInfo.description}</p>
          <p className="text-xs text-muted-foreground">{errorInfo.suggestion}</p>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Error Details (Development)
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}

          <Button onClick={resetErrorBoundary} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

interface QueryErrorBoundaryProps {
  children: ReactNode
  fallback?: (props: QueryErrorFallbackProps) => ReactNode
}

/**
 * Query Error Boundary Wrapper
 * Provides error boundaries specifically for React Query errors
 */
export function QueryErrorBoundary({ children, fallback }: QueryErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} fallbackRender={fallback || QueryErrorFallback}>
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}

/**
 * Simple Error Boundary Class Component
 */
class ErrorBoundary extends React.Component<
  {
    children: ReactNode
    fallbackRender: (props: QueryErrorFallbackProps) => ReactNode
    onReset: () => void
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: {
    children: ReactNode
    fallbackRender: (props: QueryErrorFallbackProps) => ReactNode
    onReset: () => void
  }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Query Error Boundary caught an error:', error, errorInfo)

    // Show toast notification
    toast.error('Data loading failed', {
      description: 'There was an error loading the requested data.',
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallbackRender({
        error: this.state.error,
        resetErrorBoundary: () => {
          this.setState({ hasError: false, error: null })
          this.props.onReset()
        },
      })
    }

    return this.props.children
  }
}

/**
 * Hook for handling query errors in components
 */
export function useQueryErrorHandler() {
  const { reset } = useQueryErrorResetBoundary()

  const handleError = React.useCallback((error: Error) => {
    console.error('Query Error:', error)

    const message = error.message.toLowerCase()

    if (message.includes('agent') && message.includes('not found')) {
      toast.error('Agent not found', {
        description: 'The requested agent could not be found.',
      })
    } else if (message.includes('escrow') && message.includes('not found')) {
      toast.error('Escrow not found', {
        description: 'The requested escrow could not be found.',
      })
    } else if (message.includes('network') || message.includes('connection')) {
      toast.error('Network error', {
        description: 'Unable to connect to the blockchain. Please check your connection.',
      })
    } else {
      toast.error('Query failed', {
        description: 'An error occurred while loading data. Please try again.',
      })
    }
  }, [])

  const retryQuery = React.useCallback(() => {
    reset()
  }, [reset])

  return { handleError, retryQuery }
}

export default QueryErrorBoundary
