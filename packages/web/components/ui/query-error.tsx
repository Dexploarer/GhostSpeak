'use client'

import { AlertCircle, RefreshCw, Copy, ExternalLink, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getErrorInfo, type ErrorInfo } from '@/lib/errors/error-messages'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface QueryErrorProps {
  error: unknown
  onRetry?: () => void
  className?: string
  compact?: boolean
}

export function QueryError({ error, onRetry, className, compact = false }: QueryErrorProps) {
  const errorInfo = getErrorInfo(error)
  const errorString = error instanceof Error ? error.message : String(error)

  const copyErrorDetails = () => {
    const details = `Error: ${errorInfo.title}\nDescription: ${errorInfo.description}\nCode: ${errorInfo.code ?? 'N/A'}\nFull Error: ${errorString}`
    navigator.clipboard.writeText(details)
    toast.success('Error details copied to clipboard')
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20', className)}>
        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
        <p className="text-sm text-red-500 flex-1">{errorInfo.title}</p>
        {onRetry && errorInfo.isRecoverable && (
          <Button variant="ghost" size="sm" onClick={onRetry} className="shrink-0">
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border border-red-500/20 bg-red-500/5 p-6', className)}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground mb-1">{errorInfo.title}</h3>
          <p className="text-sm text-muted-foreground mb-2">{errorInfo.description}</p>
          {errorInfo.action && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Suggestion:</span> {errorInfo.action}
            </p>
          )}
          {errorInfo.code && (
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              Error Code: {errorInfo.code}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-red-500/10">
        {onRetry && errorInfo.isRecoverable && (
          <Button onClick={onRetry} size="sm">
            <RefreshCw className="w-3 h-3 mr-2" />
            Try Again
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={copyErrorDetails}>
          <Copy className="w-3 h-3 mr-2" />
          Copy Details
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.open('https://docs.ghostspeak.io/troubleshooting', '_blank')}
        >
          <HelpCircle className="w-3 h-3 mr-2" />
          Help
        </Button>
      </div>
    </div>
  )
}

// Empty state with error styling
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      {icon && (
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// Connection required state
export function WalletRequired({ className }: { className?: string }) {
  return (
    <EmptyState
      className={className}
      icon={<AlertCircle className="w-8 h-8 text-muted-foreground" />}
      title="Wallet Required"
      description="Connect your wallet to view this content."
    />
  )
}

// Network error state
export function NetworkError({ onRetry, className }: { onRetry?: () => void; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-yellow-500" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">Connection Issue</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        Could not connect to the Solana network. This might be a temporary issue.
      </p>
      {onRetry && (
        <Button onClick={onRetry} size="sm">
          <RefreshCw className="w-3 h-3 mr-2" />
          Retry
        </Button>
      )}
    </div>
  )
}
