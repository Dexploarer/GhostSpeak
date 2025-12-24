'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  useCompleteEscrow,
  useCancelEscrow,
  useDisputeEscrow,
  type Escrow,
  EscrowStatus,
} from '@/lib/queries/escrow'
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Shield, Ban, Scale } from 'lucide-react'
import { toast } from 'sonner'

interface EscrowActionsProps {
  escrow: Escrow
  userRole: 'client' | 'agent' | 'none'
  onActionComplete?: () => void
}

export function EscrowActions({ escrow, userRole, onActionComplete }: EscrowActionsProps) {
  const [dialogOpen, setDialogOpen] = useState<'complete' | 'cancel' | 'dispute' | null>(null)
  const [notes, setNotes] = useState('')
  const [disputeReason, setDisputeReason] = useState('')
  const [evidence, setEvidence] = useState('')

  const completeEscrow = useCompleteEscrow()
  const cancelEscrow = useCancelEscrow()
  const disputeEscrow = useDisputeEscrow()

  const isActive = escrow.status === EscrowStatus.Active
  const isPending = completeEscrow.isPending || cancelEscrow.isPending || disputeEscrow.isPending

  const handleComplete = async () => {
    try {
      await completeEscrow.mutateAsync({
        escrowAddress: escrow.address,
        resolutionNotes: notes,
      })
      setDialogOpen(null)
      setNotes('')
      onActionComplete?.()
    } catch (error) {
      console.error('Failed to complete escrow:', error)
    }
  }

  const handleCancel = async () => {
    try {
      await cancelEscrow.mutateAsync({
        escrowAddress: escrow.address,
        reason: notes || 'Cancelled by client',
      })
      setDialogOpen(null)
      setNotes('')
      onActionComplete?.()
    } catch (error) {
      console.error('Failed to cancel escrow:', error)
    }
  }

  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      toast.error('Please provide a reason for the dispute')
      return
    }

    try {
      await disputeEscrow.mutateAsync({
        escrowAddress: escrow.address,
        reason: disputeReason,
        evidence: evidence.split('\n').filter((e) => e.trim()),
      })
      setDialogOpen(null)
      setDisputeReason('')
      setEvidence('')
      onActionComplete?.()
    } catch (error) {
      console.error('Failed to dispute escrow:', error)
    }
  }

  // Determine which actions are available based on role and status
  const canComplete = isActive && userRole === 'client'
  const canCancel = isActive && userRole === 'client'
  const canDispute = isActive && (userRole === 'client' || userRole === 'agent')

  if (!isActive || userRole === 'none') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Shield className="w-4 h-4" />
        {escrow.status === EscrowStatus.Completed && 'Escrow completed'}
        {escrow.status === EscrowStatus.Disputed && 'Under dispute'}
        {escrow.status === EscrowStatus.Cancelled && 'Escrow cancelled'}
        {escrow.status === EscrowStatus.Refunded && 'Funds refunded'}
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canComplete && (
          <Button
            onClick={() => setDialogOpen('complete')}
            disabled={isPending}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Release Funds
          </Button>
        )}

        {canCancel && (
          <Button
            onClick={() => setDialogOpen('cancel')}
            disabled={isPending}
            variant="outline"
            size="sm"
          >
            <Ban className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        )}

        {canDispute && (
          <Button
            onClick={() => setDialogOpen('dispute')}
            disabled={isPending}
            variant="outline"
            size="sm"
            className="border-orange-500/50 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
          >
            <Scale className="w-4 h-4 mr-2" />
            Dispute
          </Button>
        )}
      </div>

      {/* Complete Dialog */}
      <Dialog
        open={dialogOpen === 'complete'}
        onOpenChange={(open) => !open && setDialogOpen(null)}
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <DialogTitle>Release Escrow Funds</DialogTitle>
                <DialogDescription>
                  Confirm that the work has been completed satisfactorily.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Amount to release: {(Number(escrow.amount) / 1_000_000).toFixed(2)} USDC
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Funds will be transferred to the agent immediately.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about the completed work..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={completeEscrow.isPending}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(null)}
              disabled={completeEscrow.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={completeEscrow.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {completeEscrow.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Release
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={dialogOpen === 'cancel'} onOpenChange={(open) => !open && setDialogOpen(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <DialogTitle>Cancel Escrow</DialogTitle>
                <DialogDescription>Cancel this escrow and request a refund.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Cancellation may require agent approval
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    If work has already started, the agent may dispute this cancellation.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancelReason">Reason for Cancellation *</Label>
              <Textarea
                id="cancelReason"
                placeholder="Please explain why you're cancelling..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={cancelEscrow.isPending}
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(null)}
              disabled={cancelEscrow.isPending}
            >
              Keep Escrow
            </Button>
            <Button onClick={handleCancel} disabled={cancelEscrow.isPending} variant="destructive">
              {cancelEscrow.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel Escrow
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={dialogOpen === 'dispute'} onOpenChange={(open) => !open && setDialogOpen(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Scale className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <DialogTitle>File Dispute</DialogTitle>
                <DialogDescription>Request arbitration for this escrow.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                A 1% dispute fee will be charged from the resolution amount. An arbitrator will
                review the case and make a decision.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="disputeReason">Reason for Dispute *</Label>
              <Textarea
                id="disputeReason"
                placeholder="Describe the issue in detail..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                disabled={disputeEscrow.isPending}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="evidence">Evidence Links (one per line)</Label>
              <Textarea
                id="evidence"
                placeholder="https://ipfs.io/...&#10;https://example.com/screenshot.png"
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                disabled={disputeEscrow.isPending}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Provide links to screenshots, documents, or other evidence
              </p>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(null)}
              disabled={disputeEscrow.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDispute}
              disabled={disputeEscrow.isPending || !disputeReason.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {disputeEscrow.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Filing...
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4 mr-2" />
                  File Dispute
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
