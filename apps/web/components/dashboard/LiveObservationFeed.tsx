'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Doc, Id } from '@/convex/_generated/dataModel'
import { useEffect, useMemo, useState } from 'react'
import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { isVerifiedSessionForWallet } from '@/lib/auth/verifiedSession'
import {
  Eye,
  Loader2,
  MessageSquare,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  ChevronDown,
  Activity,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { TerminalWindow } from '@/components/shared/TerminalWindow'

// The query returns endpointTests joined with observedEndpoints
type ObservationWithEndpoint = Doc<'endpointTests'> & {
  endpoint?: Doc<'observedEndpoints'>
  myVote?: 'upvote' | 'downvote' | null
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 86400)}d ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function formatPrice(usdc: number): string {
  if (usdc < 0.0001) return '<$0.0001'
  if (usdc < 0.01) return `$${usdc.toFixed(4)}`
  return `$${usdc.toFixed(2)}`
}

export function LiveObservationFeed() {
  const { publicKey } = useWallet()
  // Wallet Standard provider exposes the address as a string (or null)
  const walletAddress = useMemo(() => publicKey ?? undefined, [publicKey])
  const [hasVerifiedSession, setHasVerifiedSession] = useState(false)

  // Voting requires a verified SIWS session (user record must exist).
  // Same-tab localStorage writes don't fire the "storage" event, so poll briefly.
  useEffect(() => {
    if (!walletAddress) {
      setHasVerifiedSession(false)
      return
    }

    const check = () => setHasVerifiedSession(isVerifiedSessionForWallet(walletAddress))
    check()

    const intervalId = window.setInterval(() => {
      const next = isVerifiedSessionForWallet(walletAddress)
      setHasVerifiedSession(next)
      if (next) window.clearInterval(intervalId)
    }, 500)

    return () => window.clearInterval(intervalId)
  }, [walletAddress])

  // Explicitly cast the query result to our constructed type
  const observations = useQuery(api.observation.getRecentObservations, {
    limit: 50,
    walletAddress: walletAddress,
  }) as ObservationWithEndpoint[] | undefined

  const vote = useMutation(api.observation.voteOnObservation)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleVote = async (
    e: React.MouseEvent,
    observationId: Id<'endpointTests'>,
    voteType: 'upvote' | 'downvote'
  ) => {
    e.stopPropagation()
    if (!walletAddress) return
    if (!hasVerifiedSession) return

    try {
      await vote({
        observationId,
        walletAddress,
        voteType,
      })
    } catch (err) {
      console.error('Failed to vote:', err)
    }
  }

  if (!observations) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-white/40">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <p>Connecting to live feed...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {walletAddress && !hasVerifiedSession && (
        <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60">
          Sign in to vote.
        </div>
      )}
      {observations.map((obs) => {
        const isExpanded = expandedId === obs._id
        const isSuccess = obs.success
        const hasTranscript = obs.transcript && obs.transcript.length > 0
        const myVote = obs.myVote // 'upvote' | 'downvote' | null

        return (
          <Collapsible
            key={obs._id}
            open={isExpanded}
            onOpenChange={(open) => setExpandedId(open ? obs._id : null)}
          >
            <div
              className={`bg-[#111111] border rounded-xl overflow-hidden transition-all ${
                isExpanded
                  ? 'border-primary/50 ring-1 ring-primary/20'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <CollapsibleTrigger className="w-full group">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Status Icon */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isSuccess ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {isSuccess ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </div>

                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm px-2 py-0.5 rounded bg-white/5 text-white/80">
                          {obs.endpoint?.method || 'GET'}
                        </span>
                        <span
                          className="text-white font-medium truncate max-w-[300px]"
                          title={obs.endpoint?.endpoint}
                        >
                          {obs.endpoint?.endpoint || 'Unknown Endpoint'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {obs.responseTimeMs}ms
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {formatPrice(obs.paymentAmountUsdc || 0)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(obs._creationTime)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Voting Buttons */}
                    <div
                      className="flex items-center bg-white/5 rounded-lg border border-white/5 mr-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => handleVote(e, obs._id, 'upvote')}
                        disabled={!walletAddress || !hasVerifiedSession}
                        className={`p-1.5 px-2 flex items-center gap-1.5 text-xs transition-colors hover:bg-white/10 ${
                          myVote === 'upvote'
                            ? 'text-green-400 bg-green-500/10'
                            : 'text-white/40 hover:text-white/80'
                        }`}
                        title="Good result (fast/correct)"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {(obs.upvotes || 0) > 0 && <span>{obs.upvotes}</span>}
                      </button>
                      <div className="w-px h-4 bg-white/10" />
                      <button
                        onClick={(e) => handleVote(e, obs._id, 'downvote')}
                        disabled={!walletAddress || !hasVerifiedSession}
                        className={`p-1.5 px-2 flex items-center gap-1.5 text-xs transition-colors hover:bg-white/10 ${
                          myVote === 'downvote'
                            ? 'text-red-400 bg-red-500/10'
                            : 'text-white/40 hover:text-white/80'
                        }`}
                        title="Bad result (slow/failed/expensive)"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        {(obs.downvotes || 0) > 0 && <span>{obs.downvotes}</span>}
                      </button>
                    </div>

                    {hasTranscript && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs">
                        <MessageSquare className="w-3 h-3" />
                        Transcript
                      </div>
                    )}
                    <span
                      className={`px-2 py-1 rounded text-xs font-mono ${
                        obs.responseStatus === 200
                          ? 'bg-green-500/10 text-green-400'
                          : obs.responseStatus === 402
                            ? 'bg-orange-500/10 text-orange-400'
                            : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {obs.responseStatus || 'ERR'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t border-white/10 bg-black/40 p-6">
                  {hasTranscript && (
                    <TerminalWindow title="observation_log.txt" className="mb-4">
                      <div className="space-y-3 font-mono text-sm p-6 overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                        {obs.transcript?.map((entry, i) => (
                          <div
                            key={i}
                            className={`flex gap-3 ${
                              entry.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <div
                              className={`max-w-[85%] rounded-lg p-3 ${
                                entry.role === 'user'
                                  ? 'bg-primary/10 text-primary-foreground border border-primary/20'
                                  : entry.role === 'system'
                                    ? 'bg-yellow-500/5 text-yellow-200/80 border border-yellow-500/10 text-xs'
                                    : 'bg-white/5 text-white/80 border border-white/10'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4 mb-1 opacity-50 text-[10px] uppercase">
                                <span>
                                  {entry.role === 'user'
                                    ? 'Caisper (Probe)'
                                    : entry.role === 'system'
                                      ? 'System Event'
                                      : 'Agent Response'}
                                </span>
                                <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <div className="whitespace-pre-wrap wrap-break-word">
                                {entry.content}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TerminalWindow>
                  )}

                  {!hasTranscript && (
                    <TerminalWindow title="status.log" className="mb-4">
                      <div className="p-8 text-center text-white/20 text-sm font-mono">
                        No detailed transcript available for this test.
                      </div>
                    </TerminalWindow>
                  )}

                  {obs.caisperNotes && (
                    <div className="mb-4 p-3 rounded bg-white/5 border border-white/5 text-sm">
                      <div className="flex items-center gap-2 text-white/60 mb-1">
                        <Terminal className="w-3 h-3" />
                        <span className="uppercase text-[10px] tracking-wider">
                          Caisper Analysis
                        </span>
                      </div>
                      <p className="text-white/80">{obs.caisperNotes}</p>
                    </div>
                  )}

                  {obs.issues && obs.issues.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <h4 className="text-xs uppercase text-red-400 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" />
                        Issues Detected
                      </h4>
                      <ul className="list-disc list-inside text-sm text-red-400/80 space-y-1">
                        {obs.issues.map((issue: string, i: number) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )
      })}
    </div>
  )
}
