'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Clock,
  Shield,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Lock,
  Percent,
  TrendingUp,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import type { Escrow } from '@/lib/queries/escrow'
import { EscrowStatus } from '@/lib/queries/escrow'

interface EscrowCardProps {
  escrow: Escrow
  onViewDetails: (escrow: Escrow) => void
  onComplete?: (escrow: Escrow) => void
  onCancel?: (escrow: Escrow) => void
  onDispute?: (escrow: Escrow) => void
  userRole?: 'client' | 'agent' | 'viewer'
}

const statusConfig = {
  [EscrowStatus.Active]: {
    color: 'bg-blue-500',
    icon: Shield,
    label: 'Active',
    variant: 'default' as const,
  },
  [EscrowStatus.Completed]: {
    color: 'bg-green-500',
    icon: CheckCircle,
    label: 'Completed',
    variant: 'secondary' as const,
  },
  [EscrowStatus.Disputed]: {
    color: 'bg-red-500',
    icon: AlertTriangle,
    label: 'Disputed',
    variant: 'destructive' as const,
  },
  [EscrowStatus.Resolved]: {
    color: 'bg-purple-500',
    icon: CheckCircle,
    label: 'Resolved',
    variant: 'secondary' as const,
  },
  [EscrowStatus.Cancelled]: {
    color: 'bg-gray-500',
    icon: XCircle,
    label: 'Cancelled',
    variant: 'outline' as const,
  },
  [EscrowStatus.Refunded]: {
    color: 'bg-orange-500',
    icon: ArrowLeft,
    label: 'Refunded',
    variant: 'secondary' as const,
  },
}

export function EscrowCard({
  escrow,
  onViewDetails,
  onComplete,
  onCancel,
  onDispute,
  userRole = 'viewer',
}: EscrowCardProps): React.JSX.Element {
  const statusInfo = statusConfig[escrow.status]
  const StatusIcon = statusInfo.icon

  // Calculate milestone progress
  const totalMilestones = escrow.milestones.length
  const completedMilestones = escrow.milestones.filter((m) => m.completed).length
  const milestoneProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0

  // Calculate amounts
  const totalAmount = Number(escrow.amount) / Math.pow(10, escrow.tokenMetadata.decimals)
  const totalFees = Number(escrow.totalFeesCollected) / Math.pow(10, escrow.tokenMetadata.decimals)
  const interestEarned = Number(escrow.interestEarned) / Math.pow(10, escrow.tokenMetadata.decimals)

  // Format time remaining
  const timeRemaining =
    escrow.expiresAt > new Date()
      ? formatDistanceToNow(escrow.expiresAt, { addSuffix: true })
      : 'Expired'

  const isExpired = escrow.expiresAt <= new Date()
  const hasTransferFees = escrow.tokenMetadata.transferFeeConfig !== undefined
  const hasInterestBearing = escrow.tokenMetadata.extensions.some(
    (ext) => ext.type === 'InterestBearing'
  )

  // User action permissions
  const canComplete = userRole === 'agent' && escrow.status === EscrowStatus.Active
  const canCancel = userRole === 'client' && escrow.status === EscrowStatus.Active
  const canDispute =
    (userRole === 'client' || userRole === 'agent') && escrow.status === EscrowStatus.Active

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
              {escrow.taskId}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span>Client: {escrow.clientName || escrow.client.slice(0, 8) + '...'}</span>
              <span>•</span>
              <span>Agent: {escrow.agentName || escrow.agent.slice(0, 8) + '...'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusInfo.variant} className="flex items-center gap-1">
              <StatusIcon className="w-3 h-3" />
              {statusInfo.label}
            </Badge>
            {escrow.isConfidential && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Private
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Amount and Token Info */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-white">
              {totalAmount.toLocaleString()} {escrow.tokenMetadata.symbol}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            {hasTransferFees && (
              <div className="flex items-center gap-1">
                <Percent className="w-3 h-3" />
                <span>
                  {escrow.tokenMetadata.transferFeeConfig!.transferFeeBasisPoints / 100}% fee
                </span>
              </div>
            )}
            {hasInterestBearing && interestEarned > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>+{interestEarned.toFixed(4)} earned</span>
              </div>
            )}
          </div>
        </div>

        {/* Milestone Progress */}
        {totalMilestones > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                Milestones: {completedMilestones}/{totalMilestones}
              </span>
              <span className="text-gray-600 dark:text-gray-300">
                {Math.round(milestoneProgress)}%
              </span>
            </div>
            <Progress value={milestoneProgress} className="h-2" />
          </div>
        )}

        {/* Time and Additional Info */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span className={cn(isExpired && 'text-red-500')}>
              {isExpired ? 'Expired' : `Expires ${timeRemaining}`}
            </span>
          </div>
          <div className="text-right">
            <div>Created {formatDistanceToNow(escrow.createdAt, { addSuffix: true })}</div>
            {totalFees > 0 && (
              <div className="text-xs text-gray-500">
                Fees: {totalFees.toFixed(4)} {escrow.tokenMetadata.symbol}
              </div>
            )}
          </div>
        </div>

        {/* Dispute/Resolution Info */}
        {escrow.status === EscrowStatus.Disputed && escrow.disputeReason && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-red-800 dark:text-red-200">Dispute Filed</div>
                <div className="text-red-700 dark:text-red-300 mt-1">{escrow.disputeReason}</div>
              </div>
            </div>
          </div>
        )}

        {escrow.resolutionNotes && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
            <div className="font-medium text-blue-800 dark:text-blue-200">Resolution Notes</div>
            <div className="text-blue-700 dark:text-blue-300 mt-1">{escrow.resolutionNotes}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(escrow)}
            className="flex items-center gap-1"
          >
            <Eye className="w-4 h-4" />
            Details
          </Button>

          {canComplete && onComplete && (
            <Button
              size="sm"
              onClick={() => onComplete(escrow)}
              className="flex items-center gap-1"
            >
              <CheckCircle className="w-4 h-4" />
              Complete
            </Button>
          )}

          {canDispute && onDispute && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDispute(escrow)}
              className="flex items-center gap-1 text-yellow-600 border-yellow-300 hover:bg-yellow-50"
            >
              <AlertTriangle className="w-4 h-4" />
              Dispute
            </Button>
          )}

          {canCancel && onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(escrow)}
              className="flex items-center gap-1 text-red-600 border-red-300 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
