/**
 * x402 Payment Dialog Component
 *
 * Handles x402 payment flow with wallet integration
 */

'use client'

import React, { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Loader2, CheckCircle2, XCircle, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useCreateX402Payment } from '@/lib/hooks/useX402'
import type { Agent } from '@/lib/ghostspeak'

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent: Agent
  onSuccess?: (signature: string) => void
}

export function PaymentDialog({
  open,
  onOpenChange,
  agent,
  onSuccess
}: PaymentDialogProps): React.JSX.Element {
  const { publicKey } = useWallet()
  const [quantity, setQuantity] = useState(1)
  const [metadata, setMetadata] = useState('')

  const createPayment = useCreateX402Payment()

  const pricePerCall = Number(agent.pricing?.pricePerCall ?? 0) / 1e9 // Convert lamports to SOL
  const totalAmount = pricePerCall * quantity

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    if (!publicKey) return

    try {
      const metadataObj = metadata
        ? JSON.parse(metadata)
        : {}

      const receipt = await createPayment.mutateAsync({
        recipient: agent.address,
        amount: BigInt(Math.floor(totalAmount * 1e9)), // Convert to lamports
        token: agent.pricing?.paymentToken ?? agent.address,
        description: `Payment for ${agent.name} service (${quantity} call${quantity > 1 ? 's' : ''})`,
        metadata: {
          agentAddress: agent.address,
          agentName: agent.name,
          quantity: quantity.toString(),
          ...metadataObj
        }
      })

      if (onSuccess && receipt.signature) {
        onSuccess(receipt.signature)
      }

      // Close dialog after success
      setTimeout(() => {
        onOpenChange(false)
        setQuantity(1)
        setMetadata('')
      }, 2000)
    } catch (error) {
      console.error('Payment failed:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            x402 Payment
          </DialogTitle>
          <DialogDescription>
            Make an instant micropayment for {agent.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Agent Info */}
          <div className="glass rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Agent</span>
              <span className="font-medium">{agent.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Price per Call</span>
              <span className="font-mono">{pricePerCall.toFixed(6)} SOL</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Payment Token</span>
              <span className="font-mono text-xs truncate max-w-[200px]">
                {agent.pricing?.paymentToken ?? 'N/A'}
              </span>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Number of Calls</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              placeholder="1"
              disabled={createPayment.isPending}
            />
          </div>

          {/* Optional Metadata */}
          <div className="space-y-2">
            <Label htmlFor="metadata">
              Metadata (Optional JSON)
            </Label>
            <Input
              id="metadata"
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              placeholder='{"requestId": "abc123"}'
              disabled={createPayment.isPending}
            />
          </div>

          {/* Total Amount */}
          <div className="glass rounded-lg p-4 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border-2 border-cyan-500/20">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total Amount</span>
              <span className="text-2xl font-bold gradient-text">
                {totalAmount.toFixed(6)} SOL
              </span>
            </div>
          </div>

          {/* Status Messages */}
          {createPayment.isError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400">
              <XCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">
                {createPayment.error instanceof Error
                  ? createPayment.error.message
                  : 'Payment failed. Please try again.'}
              </p>
            </div>
          )}

          {createPayment.isSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p className="text-sm">Payment successful!</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createPayment.isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              disabled={!publicKey || createPayment.isPending || createPayment.isSuccess}
              className="flex-1 gap-2"
            >
              {createPayment.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  Pay {totalAmount.toFixed(6)} SOL
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
