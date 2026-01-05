'use client'

import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Activity,
  Eye,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  BarChart3,
  Filter,
  RefreshCw,
  ChevronDown,
  ExternalLink,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'

// Grade colors
const GRADE_COLORS: Record<string, string> = {
  A: 'text-green-400 bg-green-500/10 border-green-500/20',
  B: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  C: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  D: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  F: 'text-red-400 bg-red-500/10 border-red-500/20',
}

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

export default function ObservePage() {
  const { publicKey } = useWallet()
  const router = useRouter()
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)

  // Redirect if not connected
  useEffect(() => {
    if (publicKey === null) {
      router.push('/')
    }
  }, [publicKey, router])

  // Fetch observatory stats
  const stats = useQuery(api.observation.getObservatoryStats, {})

  // Fetch endpoints
  const endpoints = useQuery(api.observation.listEndpoints, {
    activeOnly: true,
  })

  // Group endpoints by agent
  const agentGroups = endpoints
    ? endpoints.reduce(
        (acc, ep) => {
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
        {} as Record<string, any>
      )
    : {}

  // Calculate agent-level stats
  for (const agent of Object.values(agentGroups)) {
    const eps = agent.endpoints
    agent.avgQuality = eps.length > 0
      ? Math.round(eps.reduce((sum: number, ep: any) => sum + (ep.avgQualityScore || 50), 0) / eps.length)
      : 0
    agent.totalTests = eps.reduce((sum: number, ep: any) => sum + (ep.totalTests || 0), 0)
  }

  // Filter by category
  const filteredGroups = Object.values(agentGroups).filter((agent: any) => {
    if (categoryFilter === 'all') return true
    return agent.endpoints.some((ep: any) => ep.category === categoryFilter)
  })

  if (publicKey === undefined) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
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
                <p className="text-sm text-white/60">Caisper tests x402 endpoints to verify agent capabilities</p>
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
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
              <Activity className="w-4 h-4" />
              Endpoints
            </div>
            <div className="text-2xl font-light text-white">
              {stats?.totalEndpoints ?? '-'}
            </div>
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
            <div className="text-2xl font-light text-white">
              {stats?.uniqueAgents ?? '-'}
            </div>
          </div>

          <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
              <RefreshCw className="w-4 h-4" />
              Tests (24h)
            </div>
            <div className="text-2xl font-light text-white">
              {stats?.testsLast24h ?? '-'}
            </div>
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

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
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
            filteredGroups.map((agent: any) => (
              <Collapsible
                key={agent.agentAddress}
                open={expandedAgent === agent.agentAddress}
                onOpenChange={(open) => setExpandedAgent(open ? agent.agentAddress : null)}
              >
                <div className="bg-[#111111] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors">
                  <CollapsibleTrigger className="w-full">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Quality Badge */}
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold ${
                            agent.avgQuality >= 80
                              ? 'bg-green-500/10 text-green-400'
                              : agent.avgQuality >= 60
                                ? 'bg-blue-500/10 text-blue-400'
                                : agent.avgQuality >= 40
                                  ? 'bg-yellow-500/10 text-yellow-400'
                                  : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {agent.avgQuality}
                        </div>

                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{agent.baseUrl}</span>
                            <span className="text-white/40 text-sm">
                              {agent.agentAddress.slice(0, 4)}...{agent.agentAddress.slice(-4)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-white/60">
                            <span>{agent.endpoints.length} endpoints</span>
                            <span>{agent.totalTests} tests</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Category badges */}
                        <div className="flex gap-1">
                          {[...new Set(agent.endpoints.map((ep: any) => ep.category))].slice(0, 3).map((cat: any) => (
                            <span
                              key={cat}
                              className={`px-2 py-0.5 rounded text-xs ${CATEGORY_CONFIG[cat]?.color || 'bg-gray-500/10 text-gray-400'}`}
                            >
                              {CATEGORY_CONFIG[cat]?.icon} {cat}
                            </span>
                          ))}
                        </div>

                        <ChevronDown
                          className={`w-5 h-5 text-white/40 transition-transform ${
                            expandedAgent === agent.agentAddress ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t border-white/10 divide-y divide-white/5">
                      {agent.endpoints.map((ep: any) => (
                        <div key={ep._id} className="p-4 hover:bg-white/5 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs ${CATEGORY_CONFIG[ep.category]?.color || ''}`}>
                                  {ep.method}
                                </span>
                                <span className="text-white/60 text-sm font-mono truncate">
                                  {ep.endpoint.length > 60 ? ep.endpoint.slice(0, 60) + '...' : ep.endpoint}
                                </span>
                              </div>
                              <p className="text-sm text-white/40 mt-1 line-clamp-2">
                                {ep.description}
                              </p>
                            </div>

                            <div className="flex items-center gap-4 ml-4">
                              {/* Price */}
                              <div className="text-right">
                                <div className="text-sm text-white">{formatPrice(ep.priceUsdc)}</div>
                                <div className="text-xs text-white/40">per call</div>
                              </div>

                              {/* Quality */}
                              <div className="text-right min-w-16">
                                <div className={`text-sm font-medium ${
                                  (ep.avgQualityScore || 50) >= 70 ? 'text-green-400' :
                                  (ep.avgQualityScore || 50) >= 50 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
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
                Caisper automatically tests x402 agent endpoints every hour to verify their capabilities.
                Quality scores (0-100) are based on response success, timing, and capability verification.
                These scores contribute to the Ghost Score via the apiQualityMetrics source (3% weight).
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
