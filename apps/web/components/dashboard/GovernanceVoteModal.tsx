'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Loader2, ThumbsUp, Medal, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface GovernanceVoteModalProps {
  voterAddress: string
  targetAgentAddress: string
  agentName?: string
}

export function GovernanceVoteModal({
  voterAddress,
  targetAgentAddress,
  agentName,
}: GovernanceVoteModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [score, setScore] = useState(5)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch voting power
  const powerData = useQuery(api.governance.calculateVotingPower, { address: voterAddress })

  const castVote = useMutation(api.governance.castVote)

  const handleSubmit = async () => {
    if (!powerData || powerData.power <= 0) {
      toast.error('No voting power. Participate in x402 transactions first.')
      return
    }

    setIsSubmitting(true)
    try {
      await castVote({
        voterAddress,
        targetAgentAddress,
        score,
        comment: comment || undefined,
      })
      toast.success('Vote cast successfully!')
      setIsOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to cast vote')
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasPower = powerData && powerData.power > 0

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors flex items-center gap-1.5 border border-primary/20">
          <ThumbsUp className="w-3 h-3" />
          Vote on Quality
        </button>
      </DialogTrigger>
      <DialogContent className="bg-[#111111] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Governance Vote</DialogTitle>
          <DialogDescription className="text-white/60">
            Cast your vote on the service quality of {agentName || targetAgentAddress.slice(0, 8)}.
            Voting requires x402 participation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Power Status */}
          <div
            className={cn(
              'p-3 rounded-lg border flex items-start gap-3',
              hasPower ? 'bg-blue-500/10 border-blue-500/20' : 'bg-red-500/10 border-red-500/20'
            )}
          >
            <Medal className={cn('w-5 h-5 mt-0.5', hasPower ? 'text-blue-400' : 'text-red-400')} />
            <div>
              <h4
                className={cn('text-sm font-medium', hasPower ? 'text-blue-400' : 'text-red-400')}
              >
                {hasPower ? 'You have Voting Rights' : 'No Voting Power'}
              </h4>
              <p className="text-xs text-white/60 mt-1">
                Your Power: <strong>{powerData ? powerData.power : '...'}</strong> (Based on
                Transaction Volume & Count)
              </p>
            </div>
          </div>

          {/* Score Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-white">Quality Score (1-5)</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((val: any) => (
                <button
                  key={val}
                  onClick={() => setScore(val)}
                  disabled={!hasPower}
                  className={cn(
                    'w-10 h-10 rounded-lg border flex items-center justify-center text-sm font-bold transition-all',
                    score === val
                      ? 'bg-primary text-black border-primary scale-105'
                      : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20'
                  )}
                >
                  {val}
                </button>
              ))}
              <span className="text-xs text-white/40 ml-2">
                {score === 1 ? 'Poor' : score === 5 ? 'Excellent' : ''}
              </span>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Comment (Optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={!hasPower}
              placeholder="Share details about your experience..."
              className="w-full h-24 bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!hasPower || isSubmitting}
              className="px-4 py-2 rounded-lg bg-primary text-black text-sm font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Cast Vote
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
