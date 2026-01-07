/**
 * Ghost Agent Badge Component
 *
 * Visual indicator for Ghost agent status in the UI.
 * Shows whether an agent is discovered, claimed, or verified.
 */

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type AgentStatus = 'discovered' | 'claimed' | 'verified'

interface GhostAgentBadgeProps {
  status: AgentStatus
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const statusConfig = {
  discovered: {
    label: 'Discovered',
    variant: 'secondary' as const,
    icon: '👻',
    description: 'Agent found on-chain but not yet claimed',
  },
  claimed: {
    label: 'Ghost Agent',
    variant: 'ghost' as const,
    icon: '✨',
    description: 'Verified Ghost agent with identity credential',
  },
  verified: {
    label: 'Verified Ghost',
    variant: 'success' as const,
    icon: '✓',
    description: 'Fully verified Ghost agent with credentials',
  },
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
}

export function GhostAgentBadge({
  status,
  showIcon = true,
  size = 'md',
  className,
}: GhostAgentBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge
      variant={config.variant}
      className={cn(sizeClasses[size], className)}
      title={config.description}
    >
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </Badge>
  )
}

/**
 * Compact version showing just the ghost icon for tight spaces
 */
export function GhostAgentIcon({ status, className }: { status: AgentStatus; className?: string }) {
  const config = statusConfig[status]

  return (
    <span
      className={cn('inline-flex items-center justify-center', className)}
      title={`${config.label}: ${config.description}`}
    >
      {config.icon}
    </span>
  )
}

/**
 * Network badge showing devnet status
 */
export function NetworkBadge({
  network = 'devnet',
  className,
}: {
  network?: 'devnet' | 'mainnet-beta'
  className?: string
}) {
  if (network === 'mainnet-beta') {
    return (
      <Badge variant="success" className={cn('text-xs', className)}>
        Mainnet
      </Badge>
    )
  }

  return (
    <Badge variant="devnet" className={cn('text-xs', className)}>
      Devnet
    </Badge>
  )
}

/**
 * Combined badge showing both agent status and network
 */
export function GhostAgentStatusBadge({
  status,
  network = 'devnet',
  className,
}: {
  status: AgentStatus
  network?: 'devnet' | 'mainnet-beta'
  className?: string
}) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <GhostAgentBadge status={status} size="sm" />
      <NetworkBadge network={network} />
    </div>
  )
}
