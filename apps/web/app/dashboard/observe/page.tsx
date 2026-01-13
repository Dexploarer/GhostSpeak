'use client'

import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

import { Doc } from '@/convex/_generated/dataModel'
import {
  Activity,
  Eye,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Filter,
  RefreshCw,
  ChevronDown,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'
import { isVerifiedSessionForWallet } from '@/lib/auth/verifiedSession'
import { VerificationContractCard } from '@/components/dashboard/VerificationContractCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { LiveObservationFeed } from '@/components/dashboard/LiveObservationFeed'
import { HistoricalTestsTable } from '@/components/dashboard/HistoricalTestsTable'
import { GovernanceVoteModal } from '@/components/dashboard/GovernanceVoteModal'

// Category icons and colors
const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  research: { icon: '🔍', color: 'bg-purple-500/10 text-purple-400' },
  market_data: { icon: '📊', color: 'bg-blue-500/10 text-blue-400' },
  social: { icon: '💬', color: 'bg-pink-500/10 text-pink-400' },
  utility: { icon: '🔧', color: 'bg-green-500/10 text-green-400' },
  other: { icon: '📦', color: 'bg-gray-500/10 text-gray-400' },
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function formatPrice(usdc: number): string {
  if (usdc < 0.01) return `$${usdc.toFixed(4)}`
  if (usdc < 1) return `$${usdc.toFixed(3)}`
  return `$${usdc.toFixed(2)}`
}

function getEndpointSuccessRate(ep: Doc<'observedEndpoints'>): number {
  const total = ep.totalTests ?? 0
  const successful = ep.successfulTests ?? 0
  if (total <= 0) return 0
  return (successful / total) * 100
}

export default function ObservePage() {
  const { publicKey, connecting } = useWallet()
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'directory' | 'live'>('directory')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)

  const walletAddress = useMemo(() => publicKey ?? null, [publicKey])
  const [hasVerifiedSession, setHasVerifiedSession] = useState(false)

  // A "verified" session means wallet connected AND SIWS session matches the wallet.
  useEffect(() => {
    if (!walletAddress) {
      setHasVerifiedSession(false)
      return
    }

    const check = () => setHasVerifiedSession(isVerifiedSessionForWallet(walletAddress))
    check()

    // Same-tab localStorage writes do not fire the "storage" event, so poll briefly.
    const intervalId = window.setInterval(() => {
      const next = isVerifiedSessionForWallet(walletAddress)
      setHasVerifiedSession(next)
      if (next) window.clearInterval(intervalId)
    }, 500)

    return () => window.clearInterval(intervalId)
  }, [walletAddress])

  // Redirect to home if not connected.
  // Important: wallet auto-connect can take a moment during hydration/initialization.
  // Avoid bouncing users away from /dashboard/observe while the wallet is still initializing.
  useEffect(() => {
    if (publicKey) return
    if (connecting) return

    const hasRememberedWallet = (() => {
      try {
        return !!window.localStorage.getItem('walletName')
      } catch {
        return false
      }
    })()

    const redirectTimeoutMs = hasRememberedWallet ? 1500 : 500
    const timeoutId = window.setTimeout(() => {
      router.push('/')
    }, redirectTimeoutMs)

    return () => window.clearTimeout(timeoutId)
  }, [publicKey, connecting, router])

  // Fetch observatory stats
  const stats = useQuery(api.observation.getObservatoryStats, {})

  // Fetch endpoints
  const endpoints = useQuery(api.observation.listEndpoints, {
    activeOnly: true,
  })

  // Group endpoints by agent
  type AgentGroup = {
    agentAddress: string
    baseUrl: string
    endpoints: Doc<'observedEndpoints'>[]
    avgQuality: number
    totalTests: number
  }
  const agentGroups: Record<string, AgentGroup> = endpoints
    ? endpoints.reduce(
        (acc: Record<string, AgentGroup>, ep: Doc<'observedEndpoints'>) => {
          if (!acc[ep.agentAddress]) {
            acc[ep.agentAddress] = {
              agentAddress: ep.agentAddress,
              baseUrl: ep.baseUrl,
              endpoints: [],
              avgQuality: 0,
              totalTests: 0,
            }
          }
          acc[ep.agentAddress].endpoints.push(ep)
          return acc
        },
        {} as Record<string, AgentGroup>
      )
    : {}

  // Calculate agent-level stats
  for (const agent of Object.values(agentGroups)) {
    const eps = agent.endpoints
    agent.avgQuality =
      eps.length > 0
        ? Math.round(
            eps.reduce((sum: number, ep: any) => sum + (ep.avgQualityScore || 50), 0) / eps.length
          )
        : 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agent.totalTests = eps.reduce((sum: number, ep: any) => sum + (ep.totalTests || 0), 0)
  }

  // Filter by category
  const filteredGroups = Object.values(agentGroups).filter((agent: AgentGroup) => {
    if (categoryFilter === 'all') return true
    return agent.endpoints.some((ep) => ep.category === categoryFilter)
  })

  if (publicKey === undefined) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  // Session gating: voting and personalized state rely on an existing user (verified SIWS session).
  if (!publicKey) {
    return null
  }

  if (!hasVerifiedSession) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
          <header className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-light text-white">Agent Observatory</h1>
            <Link
              href="/dashboard"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Back to Dashboard
            </Link>
          </header>

          <div className="space-y-4">
            <VerificationContractCard className="p-6 bg-[#111111] border border-white/10 rounded-xl" />
            <p className="text-xs text-white/40 leading-relaxed">Sign in to vote.</p>
          </div>
        </main>

        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#111111]">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Agent Observatory</h1>
                <p className="text-sm text-white/60">
                  Caisper tests x402 endpoints to verify agent capabilities
                </p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* View Switcher */}
        <div className="flex justify-center mb-8">
          <div className="bg-[#111111] border border-white/10 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setViewMode('directory')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'directory'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Directory
            </button>
            <button
              onClick={() => setViewMode('live')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                viewMode === 'live'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Live Feed
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            </button>
          </div>
        </div>

        {viewMode === 'live' ? (
          <LiveObservationFeed />
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
              <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                  <Activity className="w-4 h-4" />
                  Endpoints
                </div>
                <div className="text-2xl font-light text-white">{stats?.totalEndpoints ?? '-'}</div>
              </div>

              <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                  <Zap className="w-4 h-4" />
                  Active
                </div>
                <div className="text-2xl font-light text-white">
                  {stats?.activeEndpoints ?? '-'}
                </div>
              </div>

              <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                  <Eye className="w-4 h-4" />
                  Agents
                </div>
                <div className="text-2xl font-light text-white">{stats?.uniqueAgents ?? '-'}</div>
              </div>

              <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                  <RefreshCw className="w-4 h-4" />
                  Tests (24h)
                </div>
                <div className="text-2xl font-light text-white">{stats?.testsLast24h ?? '-'}</div>
              </div>

              <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Success
                </div>
                <div className="text-2xl font-light text-green-400">
                  {stats?.successRate !== undefined ? `${stats.successRate}%` : '-'}
                </div>
              </div>

              <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                  <BarChart3 className="w-4 h-4" />
                  Avg Quality
                </div>
                <div className="text-2xl font-light text-blue-400">
                  {stats?.avgQualityScore ?? '-'}
                </div>
              </div>

              <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  Fraud Alerts
                </div>
                <div className="text-2xl font-light text-orange-400">
                  {stats?.unresolvedFraudSignals ?? '-'}
                </div>
              </div>
            </div>

            {/* Historical Tests */}
            <HistoricalTestsTable />

            <div className="flex items-center gap-4 mb-6 mt-12">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-white/60" />
                <span className="text-sm text-white/60">Filter by category:</span>
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40 bg-[#111111] border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="market_data">Market Data</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="utility">Utility</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Agent Cards */}
            <div className="space-y-4">
              {!endpoints ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="text-center py-12 text-white/60">
                  No endpoints found matching your filter.
                </div>
              ) : (
                filteredGroups.map((agent: AgentGroup) => (
                  <Collapsible
                    key={agent.agentAddress}
                    open={expandedAgent === agent.agentAddress}
                    onOpenChange={(open) => setExpandedAgent(open ? agent.agentAddress : null)}
                  >
                    <div className="bg-[#111111] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors">
                      <CollapsibleTrigger className="w-full">
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                              {agent.agentAddress.slice(0, 2)}
                            </div>
                            <div className="text-left">
                              <div className="font-medium text-white flex items-center gap-2">
                                {agent.agentAddress.slice(0, 8)}...
                                <span className="text-white/40 text-xs font-mono">
                                  {agent.agentAddress}
                                </span>
                              </div>
                              <div className="text-sm text-white/60 flex items-center gap-2">
                                <span>{agent.baseUrl}</span>
                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                <span>{agent.endpoints.length} endpoints</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-8">
                            <div className="text-right">
                              <div className="text-sm text-white/60">Success Rate</div>
                              <div className="text-lg font-light text-white">
                                {Math.round(
                                  (agent.endpoints.reduce(
                                    (sum, ep) => sum + getEndpointSuccessRate(ep),
                                    0
                                  ) /
                                    agent.endpoints.length) *
                                    100
                                ) / 100}
                                %
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-sm text-white/60">Avg Quality</div>
                              <div className="text-lg font-light text-blue-400">
                                Q{agent.avgQuality}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-sm text-white/60">Total Tests</div>
                              <div className="text-lg font-light text-white">
                                {agent.totalTests}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div onClick={(e) => e.stopPropagation()}>
                                <GovernanceVoteModal
                                  voterAddress={publicKey}
                                  targetAgentAddress={agent.agentAddress}
                                />
                              </div>
                              <ChevronDown
                                className={`w-5 h-5 text-white/40 transition-transform ${
                                  expandedAgent === agent.agentAddress ? 'rotate-180' : ''
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t border-white/10 bg-white/5 p-4">
                          {agent.endpoints.map((ep) => (
                            <div
                              key={ep._id}
                              className="mb-4 last:mb-0 p-3 rounded-lg bg-[#0a0a0a] border border-white/10"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                      CATEGORY_CONFIG[ep.category]?.color ||
                                      CATEGORY_CONFIG.other.color
                                    }`}
                                  >
                                    <span className="text-lg">
                                      {CATEGORY_CONFIG[ep.category]?.icon ||
                                        CATEGORY_CONFIG.other.icon}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`text-xs px-1.5 py-0.5 rounded ${
                                          ep.method === 'GET'
                                            ? 'bg-blue-500/20 text-blue-400'
                                            : 'bg-green-500/20 text-green-400'
                                        }`}
                                      >
                                        {ep.method}
                                      </span>
                                      <span className="text-white/60 text-sm font-mono truncate">
                                        {ep.endpoint.length > 60
                                          ? ep.endpoint.slice(0, 60) + '...'
                                          : ep.endpoint}
                                      </span>
                                    </div>
                                    <p className="text-sm text-white/40 mt-1 line-clamp-2">
                                      {ep.description}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-4 ml-4">
                                    {/* Price */}
                                    <div className="text-right">
                                      <div className="text-sm text-white">
                                        {formatPrice(ep.priceUsdc)}
                                      </div>
                                      <div className="text-xs text-white/40">per call</div>
                                    </div>

                                    {/* Quality */}
                                    <div className="text-right min-w-16">
                                      <div
                                        className={`text-sm font-medium ${
                                          (ep.avgQualityScore || 50) >= 70
                                            ? 'text-green-400'
                                            : (ep.avgQualityScore || 50) >= 50
                                              ? 'text-yellow-400'
                                              : 'text-red-400'
                                        }`}
                                      >
                                        Q{ep.avgQualityScore || 50}
                                      </div>
                                      <div className="text-xs text-white/40">
                                        {ep.totalTests || 0} tests
                                      </div>
                                    </div>

                                    {/* Last tested */}
                                    <div className="text-right min-w-20">
                                      <div className="text-sm text-white/60">
                                        {ep.lastTestedAt ? formatTimeAgo(ep.lastTestedAt) : 'Never'}
                                      </div>
                                      <div className="text-xs text-white/40">last test</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))
              )}
            </div>

            {/* Info Banner */}
            <div className="mt-8 bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-white mb-1">About the Observatory</h3>
                  <p className="text-sm text-white/60">
                    Caisper automatically tests x402 agent endpoints every hour to verify their
                    capabilities. Quality scores (0-100) are based on response success, timing, and
                    capability verification. These scores contribute to the Ghost Score via the
                    apiQualityMetrics source (3% weight).
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}
