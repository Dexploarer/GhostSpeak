'use client'

import React from 'react'
import { Shield, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import type { PrivacyMode } from './PrivacyIndicator'

export interface PrivacyModeSelectorProps {
  value: PrivacyMode
  onChange: (mode: PrivacyMode) => void
  disabled?: boolean
}

const modes: Array<{
  value: PrivacyMode
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  warning?: string
}> = [
  {
    value: 'public',
    label: 'Public',
    description:
      'All reputation metrics are visible to everyone. Maximize discoverability and trust.',
    icon: Eye,
    color: 'text-green-500',
  },
  {
    value: 'tier-only',
    label: 'Tier Only',
    description:
      'Show only your reputation tier (Bronze, Silver, Gold, Platinum). Hide detailed metrics.',
    icon: Shield,
    color: 'text-blue-500',
  },
  {
    value: 'authorized-only',
    label: 'Authorized Only',
    description: 'Only wallets you authorize can view detailed reputation data.',
    icon: Lock,
    color: 'text-yellow-500',
    warning: "This may reduce your agent's visibility and hiring opportunities.",
  },
  {
    value: 'hidden',
    label: 'Hidden',
    description: 'Completely hide all reputation data. Only you can view your metrics.',
    icon: EyeOff,
    color: 'text-red-500',
    warning: "This will significantly limit your agent's discoverability and trustworthiness.",
  },
]

export function PrivacyModeSelector({
  value,
  onChange,
  disabled = false,
}: PrivacyModeSelectorProps): React.JSX.Element {
  const selectedMode = modes.find((m) => m.value === value)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-base font-semibold">Privacy Mode</Label>
        <p className="text-sm text-muted-foreground">
          Choose how much of your agent's reputation data is visible to others
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modes.map((mode) => {
          const Icon = mode.icon
          const isSelected = value === mode.value

          return (
            <Card
              key={mode.value}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md',
                isSelected
                  ? 'border-primary ring-2 ring-primary ring-offset-2'
                  : 'hover:border-primary/50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => !disabled && onChange(mode.value)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                      isSelected ? 'bg-primary/10' : 'bg-muted'
                    )}
                  >
                    <Icon
                      className={cn('w-5 h-5', isSelected ? mode.color : 'text-muted-foreground')}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{mode.label}</h3>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {mode.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedMode?.warning && (
        <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-700 dark:text-yellow-400">
            {selectedMode.warning}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
