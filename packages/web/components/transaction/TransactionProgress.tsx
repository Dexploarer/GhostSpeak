'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Check, Loader2, X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

type TransactionStep = 'signing' | 'sending' | 'confirming' | 'confirmed' | 'failed'

interface TransactionProgressProps {
  status: TransactionStep
  signature?: string
  error?: string
  onClose?: () => void
  className?: string
}

const steps: { key: TransactionStep; label: string }[] = [
  { key: 'signing', label: 'Signing' },
  { key: 'sending', label: 'Sending' },
  { key: 'confirming', label: 'Confirming' },
  { key: 'confirmed', label: 'Confirmed' },
]

function getStepIndex(status: TransactionStep): number {
  if (status === 'failed') return -1
  return steps.findIndex((s) => s.key === status)
}

export function TransactionProgress({
  status,
  signature,
  error,
  onClose,
  className,
}: TransactionProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const currentIndex = getStepIndex(status)
  const isFailed = status === 'failed'
  const isComplete = status === 'confirmed'

  useEffect(() => {
    if (isComplete || isFailed) return

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isComplete, isFailed])

  const explorerUrl = signature
    ? `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    : undefined

  return (
    <div className={cn('rounded-xl border bg-card p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-foreground">
          {isFailed
            ? 'Transaction Failed'
            : isComplete
              ? 'Transaction Complete'
              : 'Processing Transaction'}
        </h3>
        {!isComplete && !isFailed && (
          <span className="text-xs text-muted-foreground">{elapsedTime}s</span>
        )}
      </div>

      {/* Progress Steps */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-muted" />
        <div
          className={cn(
            'absolute left-4 top-4 w-0.5 transition-all duration-500',
            isFailed ? 'bg-red-500' : 'bg-primary'
          )}
          style={{
            height: isFailed
              ? '0%'
              : `${Math.min(100, ((currentIndex + 1) / steps.length) * 100)}%`,
          }}
        />

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, index) => {
            const isActive = index === currentIndex && !isFailed
            const isCompleted = index < currentIndex || isComplete
            const isPending = index > currentIndex

            return (
              <div key={step.key} className="flex items-center gap-4 relative">
                {/* Step Indicator */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isActive && 'bg-primary/20 text-primary border-2 border-primary',
                    isPending && 'bg-muted text-muted-foreground',
                    isFailed && index === 0 && 'bg-red-500 text-white'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isFailed && index === 0 ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>

                {/* Step Label */}
                <div className="flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isCompleted && 'text-foreground',
                      isActive && 'text-primary',
                      isPending && 'text-muted-foreground',
                      isFailed && index === 0 && 'text-red-500'
                    )}
                  >
                    {step.label}
                  </p>
                  {isActive && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.key === 'signing' && 'Please approve in your wallet...'}
                      {step.key === 'sending' && 'Submitting to network...'}
                      {step.key === 'confirming' && 'Waiting for confirmation...'}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Error Message */}
      {isFailed && error && (
        <div className="mt-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex items-center gap-3">
        {explorerUrl && (
          <Button variant="outline" size="sm" onClick={() => window.open(explorerUrl, '_blank')}>
            <ExternalLink className="w-3 h-3 mr-2" />
            View on Explorer
          </Button>
        )}
        {(isComplete || isFailed) && onClose && (
          <Button size="sm" onClick={onClose}>
            {isComplete ? 'Done' : 'Close'}
          </Button>
        )}
      </div>
    </div>
  )
}

// Compact inline version for toasts/notifications
export function TransactionProgressInline({
  status,
  className,
}: {
  status: TransactionStep
  className?: string
}) {
  const currentIndex = getStepIndex(status)
  const isFailed = status === 'failed'
  const isComplete = status === 'confirmed'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {steps.map((step, index) => {
        const isActive = index === currentIndex && !isFailed
        const isCompleted = index < currentIndex || isComplete

        return (
          <div
            key={step.key}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              isCompleted && 'bg-primary',
              isActive && 'bg-primary animate-pulse',
              !isCompleted && !isActive && 'bg-muted',
              isFailed && index === 0 && 'bg-red-500'
            )}
          />
        )
      })}
      <span className="text-xs text-muted-foreground ml-1">
        {isFailed ? 'Failed' : isComplete ? 'Done' : steps[currentIndex]?.label}
      </span>
    </div>
  )
}
