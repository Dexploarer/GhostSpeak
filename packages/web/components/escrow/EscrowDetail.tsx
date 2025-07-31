'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Shield,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
  Copy,
  Lock,
  Percent,
  TrendingUp,
  FileText,
  User,
  Eye,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import type { Escrow } from '@/lib/queries/escrow'
import { EscrowStatus } from '@/lib/queries/escrow'

interface EscrowDetailProps {
  escrow: Escrow | null
  isOpen: boolean
  onClose: () => void
  onComplete?: (escrow: Escrow) => void
  onCancel?: (escrow: Escrow) => void
  onDispute?: (escrow: Escrow) => void
  onPartialRefund?: (escrow: Escrow) => void
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
    icon: CheckCircle,
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

export function EscrowDetail({
  escrow,
  isOpen,
  onClose,
  onComplete,
  onCancel,
  onDispute,
  onPartialRefund,
  userRole = 'viewer',
}: EscrowDetailProps) {
  if (!escrow) return null

  const statusInfo = statusConfig[escrow.status]
  const StatusIcon = statusInfo.icon

  // Calculate amounts and progress
  const totalAmount = Number(escrow.amount) / Math.pow(10, escrow.tokenMetadata.decimals)
  const totalFees = Number(escrow.totalFeesCollected) / Math.pow(10, escrow.tokenMetadata.decimals)
  const interestEarned = Number(escrow.interestEarned) / Math.pow(10, escrow.tokenMetadata.decimals)

  const totalMilestones = escrow.milestones.length
  const completedMilestones = escrow.milestones.filter((m) => m.completed).length
  const milestoneProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0

  const completedAmount =
    escrow.milestones.filter((m) => m.completed).reduce((sum, m) => sum + Number(m.amount), 0) /
    Math.pow(10, escrow.tokenMetadata.decimals)

  const remainingAmount = totalAmount - completedAmount

  // Time calculations
  const isExpired = escrow.expiresAt <= new Date()
  const timeRemaining = isExpired
    ? 'Expired'
    : formatDistanceToNow(escrow.expiresAt, { addSuffix: true })

  // Token features
  const hasTransferFees = escrow.tokenMetadata.transferFeeConfig !== undefined
  const hasInterestBearing = escrow.tokenMetadata.extensions.some(
    (ext) => ext.type === 'InterestBearing'
  )

  // User permissions
  const canComplete = userRole === 'agent' && escrow.status === EscrowStatus.Active
  const canCancel = userRole === 'client' && escrow.status === EscrowStatus.Active
  const canDispute =
    (userRole === 'client' || userRole === 'agent') && escrow.status === EscrowStatus.Active
  const canPartialRefund =
    userRole === 'client' && escrow.status === EscrowStatus.Active && completedMilestones > 0

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{escrow.taskId}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                  <StatusIcon className="w-3 h-3" />
                  {statusInfo.label}
                </Badge>
                {escrow.isConfidential && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Confidential
                  </Badge>
                )}
                {hasTransferFees && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    Transfer Fees
                  </Badge>
                )}
                {hasInterestBearing && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Interest Bearing
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="milestones" className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              Milestones
              {totalMilestones > 0 && (
                <span className="ml-1 text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                  {completedMilestones}/{totalMilestones}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Main Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Amount
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalAmount.toLocaleString()} {escrow.tokenMetadata.symbol}
                  </div>
                  {(totalFees > 0 || interestEarned > 0) && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {totalFees > 0 &&
                        `Fees: ${totalFees.toFixed(4)} ${escrow.tokenMetadata.symbol}`}
                      {totalFees > 0 && interestEarned > 0 && ' • '}
                      {interestEarned > 0 &&
                        `Interest: +${interestEarned.toFixed(4)} ${escrow.tokenMetadata.symbol}`}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Time Remaining
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={cn('text-2xl font-bold', isExpired && 'text-red-500')}>
                    {timeRemaining}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Expires {format(escrow.expiresAt, 'MMM dd, yyyy')}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalMilestones > 0 ? `${Math.round(milestoneProgress)}%` : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {totalMilestones > 0
                      ? `${completedMilestones}/${totalMilestones} milestones`
                      : 'Single payment'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Bar */}
            {totalMilestones > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Milestone Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        Completed: {completedAmount.toFixed(4)} {escrow.tokenMetadata.symbol}
                      </span>
                      <span>
                        Remaining: {remainingAmount.toFixed(4)} {escrow.tokenMetadata.symbol}
                      </span>
                    </div>
                    <Progress value={milestoneProgress} className="h-3" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Participants */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Client
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="font-medium">{escrow.clientName || 'Unknown Client'}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {formatAddress(escrow.client)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(escrow.client, 'Client address')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Agent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="font-medium">{escrow.agentName || 'Unknown Agent'}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {formatAddress(escrow.agent)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(escrow.agent, 'Agent address')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dispute/Resolution Info */}
            {escrow.status === EscrowStatus.Disputed && escrow.disputeReason && (
              <Card className="border-red-200 dark:border-red-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <AlertTriangle className="w-4 h-4" />
                    Active Dispute
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-800 dark:text-red-200">{escrow.disputeReason}</p>
                </CardContent>
              </Card>
            )}

            {escrow.resolutionNotes && (
              <Card className="border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <CheckCircle className="w-4 h-4" />
                    Resolution Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-blue-800 dark:text-blue-200">{escrow.resolutionNotes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="milestones" className="space-y-4">
            {totalMilestones === 0 ? (
              <div className="text-center py-12">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Milestones</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  This escrow uses a single payment upon completion.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {escrow.milestones.map((milestone, index) => (
                  <Card
                    key={milestone.id}
                    className={cn(
                      'transition-all',
                      milestone.completed &&
                        'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    )}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          {milestone.completed ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                          )}
                          Milestone {index + 1}: {milestone.title}
                        </CardTitle>
                        <Badge variant={milestone.completed ? 'secondary' : 'outline'}>
                          {(
                            Number(milestone.amount) / Math.pow(10, escrow.tokenMetadata.decimals)
                          ).toLocaleString()}{' '}
                          {escrow.tokenMetadata.symbol}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {milestone.description && (
                          <p className="text-gray-600 dark:text-gray-400">
                            {milestone.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            {milestone.completed ? (
                              <span className="text-green-600 dark:text-green-400">
                                Completed{' '}
                                {milestone.completedAt &&
                                  format(milestone.completedAt, 'MMM dd, yyyy')}
                              </span>
                            ) : (
                              <span className="text-gray-500">Pending completion</span>
                            )}
                          </div>
                          {milestone.transactionId && (
                            <div className="flex items-center gap-1">
                              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                {milestone.transactionId.slice(0, 12)}...
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(milestone.transactionId!, 'Transaction ID')
                                }
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            {/* Token Information */}
            <Card>
              <CardHeader>
                <CardTitle>Token Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Token
                    </div>
                    <div className="flex items-center gap-2">
                      <span>
                        {escrow.tokenMetadata.name} ({escrow.tokenMetadata.symbol})
                      </span>
                      {escrow.tokenMetadata.extensions.length > 0 && (
                        <Badge variant="outline">Token-2022</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Decimals
                    </div>
                    <div>{escrow.tokenMetadata.decimals}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Total Supply
                    </div>
                    <div>
                      {(
                        Number(escrow.tokenMetadata.totalSupply) /
                        Math.pow(10, escrow.tokenMetadata.decimals)
                      ).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Program ID
                    </div>
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {formatAddress(escrow.tokenMetadata.programId)}
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Amounts */}
              <Card>
                <CardHeader>
                  <CardTitle>Amount Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-medium">
                      {totalAmount.toLocaleString()} {escrow.tokenMetadata.symbol}
                    </span>
                  </div>
                  {totalMilestones > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span>Completed:</span>
                        <span className="font-medium text-green-600">
                          {completedAmount.toFixed(4)} {escrow.tokenMetadata.symbol}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Remaining:</span>
                        <span className="font-medium">
                          {remainingAmount.toFixed(4)} {escrow.tokenMetadata.symbol}
                        </span>
                      </div>
                    </>
                  )}
                  {totalFees > 0 && (
                    <div className="flex justify-between">
                      <span>Fees Collected:</span>
                      <span className="font-medium text-orange-600">
                        {totalFees.toFixed(4)} {escrow.tokenMetadata.symbol}
                      </span>
                    </div>
                  )}
                  {interestEarned > 0 && (
                    <div className="flex justify-between">
                      <span>Interest Earned:</span>
                      <span className="font-medium text-green-600">
                        +{interestEarned.toFixed(4)} {escrow.tokenMetadata.symbol}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Token Features */}
              {escrow.tokenMetadata.extensions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Token-2022 Features</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {hasTransferFees && escrow.tokenMetadata.transferFeeConfig && (
                      <div>
                        <div className="font-medium">Transfer Fees</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Rate:{' '}
                          {escrow.tokenMetadata.transferFeeConfig.transferFeeBasisPoints / 100}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Max Fee:{' '}
                          {(
                            Number(escrow.tokenMetadata.transferFeeConfig.maximumFee) /
                            Math.pow(10, escrow.tokenMetadata.decimals)
                          ).toFixed(4)}{' '}
                          {escrow.tokenMetadata.symbol}
                        </div>
                      </div>
                    )}
                    {escrow.isConfidential && escrow.tokenMetadata.confidentialTransferConfig && (
                      <div>
                        <div className="font-medium">Confidential Transfers</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Auto-approve:{' '}
                          {escrow.tokenMetadata.confidentialTransferConfig.autoApproveNewAccounts
                            ? 'Yes'
                            : 'No'}
                        </div>
                      </div>
                    )}
                    {hasInterestBearing && (
                      <div>
                        <div className="font-medium">Interest Bearing</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Earning interest over time
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {/* Escrow Details */}
            <Card>
              <CardHeader>
                <CardTitle>Escrow Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Escrow Address
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {formatAddress(escrow.address)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(escrow.address, 'Escrow address')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Payment Token
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {formatAddress(escrow.paymentToken)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(escrow.paymentToken, 'Token address')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Created
                    </div>
                    <div>{format(escrow.createdAt, 'MMM dd, yyyy HH:mm')}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Expires
                    </div>
                    <div>{format(escrow.expiresAt, 'MMM dd, yyyy HH:mm')}</div>
                  </div>
                  {escrow.completedAt && (
                    <div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Completed
                      </div>
                      <div>{format(escrow.completedAt, 'MMM dd, yyyy HH:mm')}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Associated Items */}
            {(escrow.workOrderAddress || escrow.marketplaceListingAddress) && (
              <Card>
                <CardHeader>
                  <CardTitle>Associated Items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {escrow.workOrderAddress && (
                    <div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Work Order
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {formatAddress(escrow.workOrderAddress)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(escrow.workOrderAddress!, 'Work order address')
                          }
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {escrow.marketplaceListingAddress && (
                    <div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Marketplace Listing
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {formatAddress(escrow.marketplaceListingAddress)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(escrow.marketplaceListingAddress!, 'Listing address')
                          }
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          {canComplete && onComplete && (
            <Button onClick={() => onComplete(escrow)} className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Complete Escrow
            </Button>
          )}

          {canPartialRefund && onPartialRefund && (
            <Button
              variant="outline"
              onClick={() => onPartialRefund(escrow)}
              className="flex items-center gap-1"
            >
              <DollarSign className="w-4 h-4" />
              Partial Refund
            </Button>
          )}

          {canDispute && onDispute && (
            <Button
              variant="outline"
              onClick={() => onDispute(escrow)}
              className="flex items-center gap-1 text-yellow-600 border-yellow-300 hover:bg-yellow-50"
            >
              <AlertTriangle className="w-4 h-4" />
              File Dispute
            </Button>
          )}

          {canCancel && onCancel && (
            <Button
              variant="outline"
              onClick={() => onCancel(escrow)}
              className="flex items-center gap-1 text-red-600 border-red-300 hover:bg-red-50"
            >
              <AlertTriangle className="w-4 h-4" />
              Cancel Escrow
            </Button>
          )}

          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
