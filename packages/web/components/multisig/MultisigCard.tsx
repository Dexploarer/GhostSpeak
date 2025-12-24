'use client'

import React from 'react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Shield,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Copy,
  MoreVertical,
  Snowflake,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import type { Multisig } from '@/lib/queries/multisig'
import { toast } from 'sonner'

interface MultisigCardProps {
  multisig: Multisig
  onClick?: () => void
  isOwner?: boolean
  className?: string
}

export function MultisigCard({
  multisig,
  onClick,
  isOwner = false,
  className,
}: MultisigCardProps): React.JSX.Element {
  const pendingCount = multisig.pendingTransactions.filter(
    (tx) => tx.status === 'Pending' || tx.status === 'PartiallyApproved'
  ).length

  const approvedCount = multisig.pendingTransactions.filter(
    (tx) => tx.status === 'FullyApproved'
  ).length

  const securityLevel =
    multisig.threshold === 1
      ? 'Low'
      : multisig.threshold <= 2
        ? 'Medium'
        : multisig.threshold <= 4
          ? 'High'
          : 'Critical'

  const securityColors = {
    Low: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    Medium: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    High: 'bg-green-500/10 text-green-500 border-green-500/20',
    Critical: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  }

  const copyAddress = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(multisig.address)
    toast.success('Address copied!')
  }

  const shortenAddress = (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`

  return (
    <GlassCard variant="interactive" className={cn('p-6 group', className)} onClick={onClick}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{multisig.multisigId.slice(0, 8)}</h3>
              {isOwner && (
                <Badge variant="outline" className="text-xs">
                  Owner
                </Badge>
              )}
              {multisig.emergencyConfig.frozen && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <Snowflake className="w-3 h-3" />
                  Frozen
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{shortenAddress(multisig.address)}</span>
              <button onClick={copyAddress} className="hover:text-foreground transition-colors">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <ExternalLink className="w-4 h-4 mr-2" />
              View on Explorer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copyAddress}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Address
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {isOwner && (
              <DropdownMenuItem className="text-red-500">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Emergency Freeze
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Threshold & Security */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">
            <span className="font-semibold">{multisig.threshold}</span>
            <span className="text-muted-foreground"> of {multisig.signers.length} signatures</span>
          </span>
        </div>
        <Badge variant="outline" className={securityColors[securityLevel]}>
          {securityLevel}
        </Badge>
      </div>

      {/* Signers Preview */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex -space-x-2">
          {multisig.signers.slice(0, 5).map((signer, _index) => (
            <Avatar key={signer} className="w-8 h-8 border-2 border-background">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {signer.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {multisig.signers.length > 5 && (
            <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
              +{multisig.signers.length - 5}
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{multisig.signers.length} signers</span>
      </div>

      {/* Pending Transactions */}
      {(pendingCount > 0 || approvedCount > 0) && (
        <div className="space-y-2 mb-4 p-3 rounded-lg bg-card/50">
          {pendingCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-yellow-500">
                <Clock className="w-4 h-4" />
                <span>{pendingCount} pending</span>
              </div>
              <span className="text-muted-foreground">Needs signatures</span>
            </div>
          )}
          {approvedCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="w-4 h-4" />
                <span>{approvedCount} ready</span>
              </div>
              <span className="text-muted-foreground">Ready to execute</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Created {formatDistanceToNow(multisig.createdAt, { addSuffix: true })}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">Nonce:</span>
          <span className="font-mono">{multisig.nonce}</span>
        </div>
      </div>
    </GlassCard>
  )
}
