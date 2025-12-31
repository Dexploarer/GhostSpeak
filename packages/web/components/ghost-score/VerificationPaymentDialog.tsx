'use client'

/**
 * Ghost Score Verification Payment Dialog
 *
 * Allows users to pay for agent verification using:
 * - Credit card via Crossmint (fiat-to-crypto)
 * - USDC directly (if they have it)
 * - GHOST tokens (future: staking for unlimited access)
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { CreditCard, Wallet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useWalletAddress } from '@/lib/hooks/useWalletAddress'
import { initializeCheckout } from '@/lib/crossmint-checkout'

interface VerificationPaymentDialogProps {
  /** Whether dialog is open */
  open: boolean
  /** Close handler */
  onClose: () => void
  /** Agent address being verified */
  agentAddress: string
  /** Callback after successful payment */
  onSuccess?: () => void
}

type PaymentMethod = 'card' | 'usdc' | null

export function VerificationPaymentDialog({
  open,
  onClose,
  agentAddress,
  onSuccess,
}: VerificationPaymentDialogProps) {
  const walletAddress = useWalletAddress()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>(
    'idle'
  )

  const handleCardPayment = async () => {
    if (!userEmail) {
      toast.error('Please enter your email address')
      return
    }

    if (!walletAddress) {
      toast.error('Please connect your wallet first')
      return
    }

    try {
      setLoading(true)
      setPaymentStatus('processing')

      // Initialize checkout
      const { checkoutUrl, orderId } = await initializeCheckout({
        userEmail,
        userWallet: walletAddress,
        agentAddress,
      })

      setCheckoutUrl(checkoutUrl)
      setOrderId(orderId)

      // Open checkout in new window
      window.open(checkoutUrl, '_blank', 'width=500,height=700')

      // Poll for payment completion
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/crossmint/checkout?orderId=${orderId}`)
          const data = await response.json()

          if (data.phase === 'completed') {
            clearInterval(pollInterval)
            setPaymentStatus('success')
            setLoading(false)
            toast.success('Payment successful! Verification granted.')

            setTimeout(() => {
              onSuccess?.()
              onClose()
            }, 2000)
          } else if (data.phase === 'failed') {
            clearInterval(pollInterval)
            setPaymentStatus('error')
            setLoading(false)
            toast.error('Payment failed. Please try again.')
          }
        } catch (error) {
          console.error('Error polling order status:', error)
        }
      }, 3000)

      // Stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval)
        if (paymentStatus === 'processing') {
          setLoading(false)
          toast.info('Payment still processing. Check back in a moment.')
        }
      }, 5 * 60 * 1000)

    } catch (error) {
      console.error('Card payment error:', error)
      setPaymentStatus('error')
      toast.error(error instanceof Error ? error.message : 'Failed to initiate payment')
    } finally {
      setLoading(false)
    }
  }

  const handleUsdcPayment = async () => {
    toast.info('USDC direct payment coming soon!')
    // TODO: Implement direct USDC payment via wallet
    // Would involve:
    // 1. Check user's USDC balance
    // 2. Create transaction to transfer 1 USDC to protocol
    // 3. Sign and send transaction
    // 4. Grant verification on confirmation
  }

  const resetDialog = () => {
    setPaymentMethod(null)
    setUserEmail('')
    setCheckoutUrl(null)
    setOrderId(null)
    setPaymentStatus('idle')
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        onClose()
        resetDialog()
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Verify Agent</DialogTitle>
          <DialogDescription>
            Pay 1 USDC to verify this agent's Ghost Score
            {paymentMethod === 'card' && (
              <span className="block mt-1 text-xs text-muted-foreground">
                (Credit card payment: $1.03 total with processing fee)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Payment Status */}
        {paymentStatus === 'success' && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium text-green-500">Payment Successful!</p>
              <p className="text-sm text-muted-foreground">Verification has been granted.</p>
            </div>
          </div>
        )}

        {paymentStatus === 'error' && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="font-medium text-red-500">Payment Failed</p>
              <p className="text-sm text-muted-foreground">Please try again or contact support.</p>
            </div>
          </div>
        )}

        {/* Payment Method Selection */}
        {!paymentMethod && paymentStatus === 'idle' && (
          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full h-auto py-4 px-4 flex items-start gap-4 hover:bg-accent hover:border-primary"
              onClick={() => setPaymentMethod('card')}
            >
              <CreditCard className="w-6 h-6 mt-1 text-primary" />
              <div className="flex-1 text-left">
                <p className="font-semibold">Pay with Credit Card</p>
                <p className="text-sm text-muted-foreground">
                  $1.03 via Crossmint (includes 3% processing fee)
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full h-auto py-4 px-4 flex items-start gap-4 hover:bg-accent hover:border-primary"
              onClick={() => setPaymentMethod('usdc')}
              disabled
            >
              <Wallet className="w-6 h-6 mt-1 text-primary" />
              <div className="flex-1 text-left">
                <p className="font-semibold">Pay with USDC</p>
                <p className="text-sm text-muted-foreground">
                  1 USDC from your wallet (coming soon)
                </p>
              </div>
            </Button>
          </div>
        )}

        {/* Credit Card Payment Form */}
        {paymentMethod === 'card' && paymentStatus !== 'success' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                We'll send your receipt here
              </p>
            </div>

            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span>Verification Fee</span>
                <span>1.00 USDC</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Processing Fee (3%)</span>
                <span>$0.03</span>
              </div>
              <div className="flex justify-between font-semibold pt-1 border-t border-border">
                <span>Total</span>
                <span>$1.03</span>
              </div>
            </div>
          </div>
        )}

        {/* USDC Payment (Coming Soon) */}
        {paymentMethod === 'usdc' && (
          <div className="py-4">
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
              <p className="text-sm text-blue-400">
                Direct USDC payments coming soon! For now, please use credit card payment.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!paymentMethod ? (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          ) : paymentStatus === 'success' ? (
            <Button onClick={() => {
              onSuccess?.()
              onClose()
            }}>
              Done
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  if (loading) return
                  resetDialog()
                }}
                disabled={loading}
              >
                Back
              </Button>
              {paymentMethod === 'card' && (
                <Button
                  onClick={handleCardPayment}
                  disabled={loading || !userEmail}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Pay $1.03'
                  )}
                </Button>
              )}
              {paymentMethod === 'usdc' && (
                <Button onClick={handleUsdcPayment} disabled>
                  Coming Soon
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
