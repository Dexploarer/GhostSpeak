'use client'

import { getCurrentNetwork, type NetworkType } from '@/lib/ghostspeak/client'
import { cn } from '@/lib/utils'
import { Wifi, WifiOff } from 'lucide-react'

interface NetworkIndicatorProps {
  className?: string
  showLabel?: boolean
}

const networkConfig: Record<NetworkType, { label: string; color: string; bgColor: string }> = {
  devnet: {
    label: 'Devnet',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10 border-yellow-500/20',
  },
  testnet: {
    label: 'Testnet',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
  },
  mainnet: {
    label: 'Mainnet',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10 border-green-500/20',
  },
}

export function NetworkIndicator({ className, showLabel = true }: NetworkIndicatorProps) {
  const network = getCurrentNetwork()
  const config = networkConfig[network]

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium',
        config.bgColor,
        config.color,
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', config.color.replace('text-', 'bg-'))} />
        <span className={cn('relative inline-flex rounded-full h-2 w-2', config.color.replace('text-', 'bg-'))} />
      </span>
      {showLabel && <span>{config.label}</span>}
    </div>
  )
}

interface ConnectionStatusProps {
  isConnected: boolean
  className?: string
}

export function ConnectionStatus({ isConnected, className }: ConnectionStatusProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium',
        isConnected
          ? 'bg-green-500/10 border-green-500/20 text-green-500'
          : 'bg-red-500/10 border-red-500/20 text-red-500',
        className
      )}
    >
      {isConnected ? (
        <Wifi className="h-3 w-3" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
    </div>
  )
}
