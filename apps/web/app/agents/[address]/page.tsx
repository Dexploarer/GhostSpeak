'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

import {
  ArrowLeft,
  Bot,
  Shield,
  Trophy,
  Award,
  Clock,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  Activity,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Footer } from '@/components/layout/Footer'
import { useState } from 'react'

export default function AgentDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const address = params.address as string
  const [expandedTest, setExpandedTest] = useState<string | null>(null)

  // Fetch agent data from Convex
  const agent = useQuery(api.ghostDiscovery.getDiscoveredAgent, { ghostAddress: address })
  const credentials = useQuery(api.credentials.getAgentCredentialsPublic, { agentAddress: address })
  const scoreData = useQuery(api.ghostScoreCalculator.calculateAgentScore, {
    agentAddress: address,
  })

  // Fetch endpoints and observations
  const endpoints = useQuery(api.observation.listEndpoints, { agentAddress: address })
  const observations = useQuery(api.observation.getTestsForAgent, {
    agentAddress: address,
    limit: 20,
  })

  const isLoading =
    agent === undefined ||
    credentials === undefined ||
    scoreData === undefined ||
    endpoints === undefined ||
    observations === undefined

  // Format tier with emoji
  const tierEmojis: Record<string, string> = {
    NEWCOMER: '🌱',
    BRONZE: '🥉',
    SILVER: '🥈',
    GOLD: '🥇',
    PLATINUM: '💎',
    DIAMOND: '👑',
  }

  // Credential type colors
  const credentialColors: Record<string, string> = {
    identity: 'text-cyan-400',
    reputation: 'text-yellow-400',
    paymentMilestone: 'text-green-400',
    staking: 'text-purple-400',
    capability: 'text-blue-400',
    uptime: 'text-orange-400',
  }

  // Health status calculation
  const getHealthStatus = (successRate: number) => {
    if (successRate >= 90) return { color: 'text-green-400', label: 'Healthy' }
    if (successRate >= 70) return { color: 'text-yellow-400', label: 'Degraded' }
    return { color: 'text-red-400', label: 'Unhealthy' }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/40 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* Agent Header */}
            <div className="bg-[#111111] border border-white/10 rounded-xl p-8 mb-6">
              <div className="flex items-start gap-6">
                <div className="p-4 bg-white/5 rounded-2xl">
                  <Bot className="w-12 h-12 text-white/60" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-light text-white font-mono break-all">
                      {address}
                    </h1>
                    <div className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-white/40">
                      Agent
                    </div>
                    {agent?.status === 'verified' && (
                      <div className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </div>
                    )}
                    {agent?.status === 'claimed' && (
                      <div className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded text-xs text-cyan-400">
                        Claimed
                      </div>
                    )}
                  </div>

                  {agent?.name && <p className="text-white/80 mb-1">{agent.name}</p>}
                  {agent?.description && (
                    <p className="text-white/60 mb-4 max-w-2xl">{agent.description}</p>
                  )}

                  {!agent && (
                    <p className="text-white/40 mb-4">
                      This agent has not been registered in the GhostSpeak network yet.
                    </p>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 border-t border-white/10 pt-6">
                    <div className="p-4 bg-black/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-white/40" />
                        <span className="text-xs text-white/40 uppercase tracking-wider">
                          Status
                        </span>
                      </div>
                      <p className="text-white font-medium capitalize">
                        {agent?.status || 'Unknown'}
                      </p>
                    </div>

                    <div className="p-4 bg-black/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 text-primary/60" />
                        <span className="text-xs text-white/40 uppercase tracking-wider">
                          Ghost Score
                        </span>
                      </div>
                      {scoreData ? (
                        <p className="text-primary font-medium">
                          {scoreData.score.toLocaleString()}/10K {tierEmojis[scoreData.tier] || ''}
                        </p>
                      ) : (
                        <p className="text-white/40">Pending</p>
                      )}
                    </div>

                    <div className="p-4 bg-black/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-yellow-400/60" />
                        <span className="text-xs text-white/40 uppercase tracking-wider">
                          Endpoints
                        </span>
                      </div>
                      <p className="text-white font-medium">{endpoints?.length || 0}</p>
                    </div>

                    <div className="p-4 bg-black/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-cyan-400/60" />
                        <span className="text-xs text-white/40 uppercase tracking-wider">
                          Observations
                        </span>
                      </div>
                      <p className="text-white font-medium">{observations?.length || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* x402 Endpoints Section */}
            <div className="bg-[#111111] border border-white/10 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-yellow-400" />
                <h2 className="text-lg font-medium text-white">x402 Endpoints</h2>
                <span className="text-white/40 text-sm">({endpoints?.length || 0})</span>
              </div>

              {endpoints && endpoints.length > 0 ? (
                <div className="grid gap-3">
                  {endpoints.map((ep) => {
                    const successRate =
                      ep.totalTests && ep.totalTests > 0
                        ? ((ep.successfulTests || 0) / ep.totalTests) * 100
                        : 0
                    const health = getHealthStatus(successRate)

                    return (
                      <div
                        key={ep._id}
                        className="p-4 bg-black/20 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs px-2 py-0.5 bg-white/5 rounded text-white/60 uppercase">
                                {ep.method}
                              </span>
                              <span className={`text-xs ${health.color}`}>{health.label}</span>
                            </div>
                            <p className="text-white font-mono text-sm break-all">{ep.endpoint}</p>
                            <p className="text-white/40 text-sm mt-1">{ep.description}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-primary font-mono">${ep.priceUsdc.toFixed(4)}</p>
                            <p className="text-white/40 text-xs">per call</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 mt-3 pt-3 border-t border-white/5 text-xs text-white/40">
                          <span>Tests: {ep.totalTests || 0}</span>
                          <span>Success: {successRate.toFixed(0)}%</span>
                          <span>Avg Response: {ep.avgResponseTimeMs?.toFixed(0) || '—'}ms</span>
                          <span>Quality: {ep.avgQualityScore?.toFixed(0) || '—'}/100</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-white/40 text-center py-8">
                  No x402 endpoints have been registered for this agent.
                </p>
              )}
            </div>

            {/* Caisper Observations Section */}
            <div className="bg-[#111111] border border-white/10 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-medium text-white">Caisper Observations</h2>
                <span className="text-white/40 text-sm">({observations?.length || 0})</span>
              </div>

              {observations && observations.length > 0 ? (
                <div className="grid gap-3">
                  {observations.map((obs) => {
                    const isExpanded = expandedTest === obs._id

                    return (
                      <div
                        key={obs._id}
                        className="p-4 bg-black/20 rounded-lg border border-white/5"
                      >
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => setExpandedTest(isExpanded ? null : obs._id)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-2 h-2 rounded-full ${obs.success ? 'bg-green-500' : 'bg-red-500'}`}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">
                                  {obs.capabilityVerified ? 'Capability Verified' : 'Test Result'}
                                </span>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${
                                    obs.qualityScore >= 80
                                      ? 'bg-green-500/10 text-green-400'
                                      : obs.qualityScore >= 50
                                        ? 'bg-yellow-500/10 text-yellow-400'
                                        : 'bg-red-500/10 text-red-400'
                                  }`}
                                >
                                  {obs.qualityScore}/100
                                </span>
                              </div>
                              <p className="text-white/40 text-xs">
                                {new Date(obs.testedAt).toLocaleString()} • {obs.responseTimeMs}ms •
                                HTTP {obs.responseStatus}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-primary text-sm font-mono">
                              ${obs.paymentAmountUsdc.toFixed(4)}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-white/40" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-white/40" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-white/5">
                            <p className="text-white/80 text-sm mb-3">{obs.caisperNotes}</p>

                            {obs.issues && obs.issues.length > 0 && (
                              <div className="mb-3">
                                <p className="text-red-400 text-xs font-medium mb-1">
                                  Issues Found:
                                </p>
                                <ul className="list-disc list-inside text-red-400/70 text-xs">
                                  {obs.issues.map((issue, i) => (
                                    <li key={i}>{issue}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {obs.transcript && obs.transcript.length > 0 && (
                              <div className="bg-black/30 rounded p-3 max-h-48 overflow-y-auto">
                                <p className="text-white/40 text-xs font-medium mb-2">
                                  Transcript:
                                </p>
                                {obs.transcript.map((msg, i) => (
                                  <div
                                    key={i}
                                    className={`text-xs mb-2 ${
                                      msg.role === 'user'
                                        ? 'text-cyan-400'
                                        : msg.role === 'agent'
                                          ? 'text-white'
                                          : 'text-white/40'
                                    }`}
                                  >
                                    <span className="font-mono uppercase">[{msg.role}]</span>{' '}
                                    {msg.content.slice(0, 200)}
                                    {msg.content.length > 200 && '...'}
                                  </div>
                                ))}
                              </div>
                            )}

                            {obs.paymentSignature && (
                              <a
                                href={`https://solscan.io/tx/${obs.paymentSignature}?cluster=devnet`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                              >
                                View Payment on Solscan <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-white/40 text-center py-8">
                  No observations have been recorded for this agent yet.
                </p>
              )}
            </div>

            {/* Credentials Section */}
            <div className="bg-[#111111] border border-white/10 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-medium text-white">Verifiable Credentials</h2>
                <span className="text-white/40 text-sm">({credentials?.length || 0})</span>
              </div>

              {credentials && credentials.length > 0 ? (
                <div className="grid gap-3">
                  {credentials.map((cred, i) => (
                    <div
                      key={cred.credentialId || i}
                      className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${cred.isValid ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                        <div>
                          <span
                            className={`font-medium capitalize ${credentialColors[cred.type] || 'text-white'}`}
                          >
                            {cred.type.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <p className="text-xs text-white/40 font-mono">
                            {cred.credentialId?.slice(0, 24)}...
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-white/40">
                          {cred.issuedAt ? new Date(cred.issuedAt).toLocaleDateString() : 'N/A'}
                        </span>
                        {cred.isValid ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 text-center py-8">
                  No credentials have been issued for this agent yet.
                </p>
              )}
            </div>

            {/* Agent Details */}
            {agent && (
              <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-medium text-white mb-4">Agent Details</h2>
                <div className="grid gap-3 text-sm">
                  {agent.discoverySource && (
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-white/40">Discovery Source</span>
                      <span className="text-white">{agent.discoverySource}</span>
                    </div>
                  )}
                  {agent.claimedBy && (
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-white/40">Owner</span>
                      <span className="text-white font-mono text-xs">
                        {agent.claimedBy.slice(0, 8)}...{agent.claimedBy.slice(-4)}
                      </span>
                    </div>
                  )}
                  {agent.firstSeenTimestamp && (
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-white/40">First Seen</span>
                      <span className="text-white">
                        {new Date(agent.firstSeenTimestamp).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {agent.firstTxSignature && (
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-white/40">First Transaction</span>
                      <a
                        href={`https://solscan.io/tx/${agent.firstTxSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        View on Solscan
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}
