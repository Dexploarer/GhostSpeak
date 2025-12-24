'use client'

import React from 'react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  X,
  ArrowRight,
  Shield,
  Coins,
  Settings,
  Zap,
  Snowflake,
  Users,
  Loader2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import type { PendingTransaction } from '@/lib/queries/multisig'
import { TransactionType, TransactionStatus, TransactionPriority } from '@/lib/queries/multisig'
import {
  useApproveTransaction,
  useExecuteTransaction,
  useCancelTransaction,
} from '@/lib/queries/multisig'
import type { Address } from '@solana/kit'

interface PendingTransactionCardProps {
  transaction: PendingTransaction
  multisigAddress: Address
  threshold: number
  isUserSigner: boolean
  hasUserSigned: boolean
  currentUserAddress?: Address
  className?: string
}

const typeIcons: Record<TransactionType, LucideIcon> = {
  [TransactionType.Transfer]: Coins,
  [TransactionType.Withdrawal]: Coins,
  [TransactionType.EscrowRelease]: Shield,
  [TransactionType.ProposalCreation]: Users,
  [TransactionType.VoteExecution]: CheckCircle,
  [TransactionType.ParameterUpdate]: Settings,
  [TransactionType.SignerAddition]: Users,
  [TransactionType.SignerRemoval]: Users,
  [TransactionType.ThresholdUpdate]: Shield,
  [TransactionType.ConfigUpdate]: Settings,
  [TransactionType.EmergencyFreeze]: Snowflake,
  [TransactionType.EmergencyUnfreeze]: Snowflake,
  [TransactionType.ProtocolUpgrade]: Zap,
}

const typeLabels: Record<TransactionType, string> = {
  [TransactionType.Transfer]: 'Transfer',
  [TransactionType.Withdrawal]: 'Withdrawal',
  [TransactionType.EscrowRelease]: 'Escrow Release',
  [TransactionType.ProposalCreation]: 'Create Proposal',
  [TransactionType.VoteExecution]: 'Execute Vote',
  [TransactionType.ParameterUpdate]: 'Update Parameters',
  [TransactionType.SignerAddition]: 'Add Signer',
  [TransactionType.SignerRemoval]: 'Remove Signer',
  [TransactionType.ThresholdUpdate]: 'Update Threshold',
  [TransactionType.ConfigUpdate]: 'Update Config',
  [TransactionType.EmergencyFreeze]: 'Emergency Freeze',
  [TransactionType.EmergencyUnfreeze]: 'Emergency Unfreeze',
  [TransactionType.ProtocolUpgrade]: 'Protocol Upgrade',
}

const statusColors: Record<TransactionStatus, string> = {
  [TransactionStatus.Pending]: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  [TransactionStatus.PartiallyApproved]: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  [TransactionStatus.FullyApproved]: 'bg-green-500/10 text-green-500 border-green-500/20',
  [TransactionStatus.Executed]: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  [TransactionStatus.Cancelled]: 'bg-red-500/10 text-red-500 border-red-500/20',
  [TransactionStatus.Expired]: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  [TransactionStatus.Failed]: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const priorityColors: Record<TransactionPriority, string> = {
  [TransactionPriority.Low]: 'text-gray-500',
  [TransactionPriority.Normal]: 'text-blue-500',
  [TransactionPriority.High]: 'text-orange-500',
  [TransactionPriority.Critical]: 'text-red-500',
  [TransactionPriority.Emergency]: 'text-red-600',
}

export function PendingTransactionCard({
  transaction,
  multisigAddress,
  threshold,
  isUserSigner,
  hasUserSigned,
  currentUserAddress: _currentUserAddress,
  className,
}: PendingTransactionCardProps): React.JSX.Element {
  const approveTransaction = useApproveTransaction()
  const executeTransaction = useExecuteTransaction()
  const cancelTransaction = useCancelTransaction()

  const Icon = typeIcons[transaction.transactionType] ?? Settings
  const typeLabel = typeLabels[transaction.transactionType] ?? 'Unknown'

  const signaturesNeeded = threshold - transaction.currentSignatures.length
  const progressPercentage = (transaction.currentSignatures.length / threshold) * 100
  const isReady = transaction.status === TransactionStatus.FullyApproved
  const isPending =
    transaction.status === TransactionStatus.Pending ||
    transaction.status === TransactionStatus.PartiallyApproved
  const isExpired = transaction.expiresAt < new Date()

  const handleApprove = async () => {
    await approveTransaction.mutateAsync({
      multisigAddress,
      transactionId: transaction.transactionId,
    })
  }

  const handleExecute = async () => {
    await executeTransaction.mutateAsync({
      multisigAddress,
      transactionId: transaction.transactionId,
    })
  }

  const handleCancel = async () => {
    await cancelTransaction.mutateAsync({
      multisigAddress,
      transactionId: transaction.transactionId,
    })
  }

  const shortenAddress = (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`

  return (
    <GlassCard className={cn('p-6', className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn('w-10 h-10 rounded-lg flex items-center justify-center', 'bg-primary/10')}
          >
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{typeLabel}</h4>
              <Badge variant="outline" className={statusColors[transaction.status]}>
                {transaction.status}
              </Badge>
              {transaction.priority !== TransactionPriority.Normal && (
                <Badge variant="outline" className={priorityColors[transaction.priority]}>
                  {transaction.priority}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              ID: {transaction.transactionId.slice(0, 8)}...
            </p>
          </div>
        </div>

        <div className="text-right text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Created {formatDistanceToNow(transaction.createdAt, { addSuffix: true })}</span>
          </div>
          {isPending && !isExpired && (
            <div
              className={cn(
                'mt-1',
                transaction.expiresAt.getTime() - Date.now() < 86400000 && 'text-yellow-500'
              )}
            >
              Expires {formatDistanceToNow(transaction.expiresAt, { addSuffix: true })}
            </div>
          )}
          {isExpired && isPending && <div className="text-red-500 mt-1">Expired</div>}
        </div>
      </div>

      {/* Target */}
      <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-card/50">
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Target:</span>
        <span className="font-mono text-sm">{shortenAddress(transaction.target)}</span>
      </div>

      {/* Description */}
      {transaction.description && (
        <p className="text-sm text-muted-foreground mb-4">{transaction.description}</p>
      )}

      {/* Signature Progress */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Signatures</span>
          <span>
            <span className="font-semibold">{transaction.currentSignatures.length}</span>
            <span className="text-muted-foreground"> / {threshold} required</span>
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2" />

        {/* Signers who have signed */}
        {transaction.currentSignatures.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Approved by:</span>
            <div className="flex -space-x-2">
              {transaction.currentSignatures.map((sig) => (
                <Avatar key={sig.signer} className="w-6 h-6 border-2 border-background">
                  <AvatarFallback className="bg-green-500/10 text-green-500 text-xs">
                    {sig.signer.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        )}

        {/* Remaining signatures needed */}
        {isPending && signaturesNeeded > 0 && (
          <div className="flex items-center gap-2 text-xs text-yellow-500">
            <AlertTriangle className="w-3 h-3" />
            <span>
              {signaturesNeeded} more signature{signaturesNeeded !== 1 ? 's' : ''} needed
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-border/50">
        {isPending && isUserSigner && !hasUserSigned && !isExpired && (
          <Button
            onClick={handleApprove}
            disabled={approveTransaction.isPending}
            className="flex-1"
          >
            {approveTransaction.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Approve
          </Button>
        )}

        {hasUserSigned && isPending && (
          <div className="flex items-center gap-2 text-green-500 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>You approved this transaction</span>
          </div>
        )}

        {isReady && (
          <Button
            onClick={handleExecute}
            disabled={executeTransaction.isPending}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {executeTransaction.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Execute
          </Button>
        )}

        {isPending && (
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={cancelTransaction.isPending}
            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
          >
            {cancelTransaction.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </Button>
        )}

        {!isPending && !isReady && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            {transaction.status === TransactionStatus.Executed && (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Executed</span>
              </>
            )}
            {transaction.status === TransactionStatus.Cancelled && (
              <>
                <XCircle className="w-4 h-4 text-red-500" />
                <span>Cancelled</span>
              </>
            )}
            {transaction.status === TransactionStatus.Expired && (
              <>
                <Clock className="w-4 h-4" />
                <span>Expired</span>
              </>
            )}
          </div>
        )}
      </div>
    </GlassCard>
  )
}
