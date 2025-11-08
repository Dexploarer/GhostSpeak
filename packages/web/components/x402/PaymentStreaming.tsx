/**
 * x402 Payment Streaming Components
 *
 * UI for milestone-based payment streams
 */

'use client'

import React, { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  Play,
  Pause,
  CheckCircle2,
  Circle,
  Clock,
  DollarSign,
  Plus,
  X,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  usePaymentStreams,
  usePaymentStream,
  useCreatePaymentStream,
  useReleaseMilestone
} from '@/lib/hooks/useX402'
import { formatDistance } from 'date-fns'

export function PaymentStreams(): React.JSX.Element {
  const { publicKey } = useWallet()
  const { data: streams = [], isLoading } = usePaymentStreams()

  if (!publicKey) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Play className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Connect your wallet to view payment streams
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-cyan-600" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading streams...</p>
        </CardContent>
      </Card>
    )
  }

  if (streams.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Play className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">No payment streams yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {streams.map((stream) => (
        <PaymentStreamCard key={stream.id} streamId={stream.id} />
      ))}
    </div>
  )
}

interface PaymentStreamCardProps {
  streamId: string
}

function PaymentStreamCard({ streamId }: PaymentStreamCardProps): React.JSX.Element {
  const { data: stream, isLoading } = usePaymentStream(streamId)
  const releaseMilestone = useReleaseMilestone()

  if (isLoading || !stream) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  const totalAmount = Number(stream.totalAmount) / 1e9
  const releasedAmount = Number(stream.releasedAmount ?? 0) / 1e9
  const progress = totalAmount > 0 ? (releasedAmount / totalAmount) * 100 : 0

  const completedMilestones = stream.milestones.filter((m) => m.released).length
  const totalMilestones = stream.milestones.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              {stream.description}
            </CardTitle>
            <CardDescription className="mt-1">
              {completedMilestones} of {totalMilestones} milestones completed
            </CardDescription>
          </div>
          <Badge variant={stream.status === 'active' ? 'default' : 'outline'}>
            {stream.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Progress</span>
            <span className="font-medium">{progress.toFixed(1)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{releasedAmount.toFixed(4)} SOL released</span>
            <span>{totalAmount.toFixed(4)} SOL total</span>
          </div>
        </div>

        {/* Milestones */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Milestones</h4>
          {stream.milestones.map((milestone, index) => {
            const amount = Number(milestone.amount) / 1e9
            const isReleased = milestone.released
            const canRelease = !isReleased && index === completedMilestones

            return (
              <div
                key={index}
                className={`
                  flex items-center justify-between p-3 rounded-lg border
                  ${isReleased
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                  }
                `}
              >
                <div className="flex items-center gap-3 flex-1">
                  {isReleased ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{milestone.description}</div>
                    {milestone.deadline && (
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        Due {formatDistance(new Date(milestone.deadline), new Date(), {
                          addSuffix: true
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-bold">{amount.toFixed(4)} SOL</div>
                    {isReleased && (
                      <div className="text-xs text-green-600 dark:text-green-400">Released</div>
                    )}
                  </div>
                  {canRelease && (
                    <Button
                      size="sm"
                      variant="gradient"
                      onClick={() => releaseMilestone.mutate({ streamId, milestoneIndex: index })}
                      disabled={releaseMilestone.isPending}
                      className="gap-1"
                    >
                      {releaseMilestone.isPending ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Releasing...
                        </>
                      ) : (
                        <>
                          <DollarSign className="w-3 h-3" />
                          Release
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Stream Info */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Recipient</span>
            <div className="font-mono text-xs truncate">
              {stream.recipient.slice(0, 8)}...{stream.recipient.slice(-8)}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Token</span>
            <div className="font-mono text-xs truncate">
              {stream.token.slice(0, 8)}...{stream.token.slice(-8)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function CreatePaymentStreamForm({
  recipient,
  onSuccess
}: {
  recipient: string
  onSuccess?: () => void
}): React.JSX.Element {
  const [description, setDescription] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [token, setToken] = useState('So11111111111111111111111111111111111111112') // SOL
  const [milestones, setMilestones] = useState<Array<{
    description: string
    amount: string
    deadline?: string
  }>>([{ description: '', amount: '', deadline: '' }])

  const createStream = useCreatePaymentStream()

  const handleAddMilestone = (): void => {
    setMilestones([...milestones, { description: '', amount: '', deadline: '' }])
  }

  const handleRemoveMilestone = (index: number): void => {
    setMilestones(milestones.filter((_, i) => i !== index))
  }

  const handleMilestoneChange = (
    index: number,
    field: 'description' | 'amount' | 'deadline',
    value: string
  ): void => {
    const updated = [...milestones]
    updated[index][field] = value
    setMilestones(updated)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    try {
      const totalAmountLamports = BigInt(Math.floor(parseFloat(totalAmount) * 1e9))

      const milestonesData = milestones.map((m) => ({
        description: m.description,
        amount: BigInt(Math.floor(parseFloat(m.amount) * 1e9)),
        deadline: m.deadline ? new Date(m.deadline).getTime() : undefined
      }))

      await createStream.mutateAsync({
        recipient,
        totalAmount: totalAmountLamports,
        token,
        milestones: milestonesData,
        description
      })

      onSuccess?.()
    } catch (error) {
      console.error('Failed to create stream:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="stream-description">Stream Description</Label>
        <Input
          id="stream-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Long-running task payment stream"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="total-amount">Total Amount (SOL)</Label>
          <Input
            id="total-amount"
            type="number"
            step="0.000001"
            min="0"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            placeholder="1.0"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="token">Payment Token</Label>
          <Input
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Token mint address"
            className="font-mono text-xs"
            required
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Milestones</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddMilestone}
            className="gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Milestone
          </Button>
        </div>

        {milestones.map((milestone, index) => (
          <div key={index} className="glass rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Milestone {index + 1}</span>
              {milestones.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMilestone(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <Input
              value={milestone.description}
              onChange={(e) => handleMilestoneChange(index, 'description', e.target.value)}
              placeholder="Milestone description"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                step="0.000001"
                min="0"
                value={milestone.amount}
                onChange={(e) => handleMilestoneChange(index, 'amount', e.target.value)}
                placeholder="Amount (SOL)"
                required
              />
              <Input
                type="datetime-local"
                value={milestone.deadline}
                onChange={(e) => handleMilestoneChange(index, 'deadline', e.target.value)}
                placeholder="Deadline (optional)"
              />
            </div>
          </div>
        ))}
      </div>

      <Button
        type="submit"
        variant="gradient"
        disabled={createStream.isPending}
        className="w-full gap-2"
      >
        {createStream.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Creating Stream...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Create Payment Stream
          </>
        )}
      </Button>
    </form>
  )
}
