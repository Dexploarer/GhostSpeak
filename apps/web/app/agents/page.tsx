'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Bot, Shield, ExternalLink, Zap, CheckCircle, Loader2, Search } from 'lucide-react'
import { Footer } from '@/components/layout/Footer'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

export default function AgentsDirectoryPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'claimed' | 'discovered'>(
    'all'
  )
  const [hasEndpointsFilter, setHasEndpointsFilter] = useState<'all' | 'yes' | 'no'>('all')

  // Fetch all discovered agents
  const agents = useQuery(api.ghostDiscovery.listDiscoveredAgents, {})

  // Fetch all endpoints to determine which agents have them
  const allEndpoints = useQuery(api.observation.listEndpoints, {})

  // Build a Set of agent addresses that have endpoints
  const agentsWithEndpoints = useMemo(() => {
    if (!allEndpoints) return new Set<string>()
    return new Set(allEndpoints.map((e) => e.agentAddress))
  }, [allEndpoints])

  // Filter and search agents
  const filteredAgents = useMemo(() => {
    if (!agents) return []

    return agents.filter((agent) => {
      // Search filter
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        !query ||
        agent.ghostAddress.toLowerCase().includes(query) ||
        agent.name?.toLowerCase().includes(query) ||
        agent.description?.toLowerCase().includes(query)

      // Status filter
      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter

      // Endpoints filter
      const hasEndpoints = agentsWithEndpoints.has(agent.ghostAddress)
      const matchesEndpoints =
        hasEndpointsFilter === 'all' ||
        (hasEndpointsFilter === 'yes' && hasEndpoints) ||
        (hasEndpointsFilter === 'no' && !hasEndpoints)

      return matchesSearch && matchesStatus && matchesEndpoints
    })
  }, [agents, searchQuery, statusFilter, hasEndpointsFilter, agentsWithEndpoints])

  // Stats
  const stats = useMemo(() => {
    if (!agents) return { total: 0, verified: 0, claimed: 0, withEndpoints: 0 }

    return {
      total: agents.length,
      verified: agents.filter((a) => a.status === 'verified').length,
      claimed: agents.filter((a) => a.status === 'claimed').length,
      withEndpoints: agents.filter((a) => agentsWithEndpoints.has(a.ghostAddress)).length,
    }
  }, [agents, agentsWithEndpoints])

  const isLoading = agents === undefined || allEndpoints === undefined

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Agent Directory</h1>
          <p className="text-white/60">
            Browse all discovered agents on the GhostSpeak network
          </p>
        </div>

        {/* Stats Cards */}
        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
              <div className="text-white/40 text-xs uppercase mb-1">Total Agents</div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
            </div>
            <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
              <div className="text-white/40 text-xs uppercase mb-1">Verified</div>
              <div className="text-2xl font-bold text-green-400">{stats.verified}</div>
            </div>
            <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
              <div className="text-white/40 text-xs uppercase mb-1">Claimed</div>
              <div className="text-2xl font-bold text-cyan-400">{stats.claimed}</div>
            </div>
            <div className="bg-[#111111] border border-white/10 rounded-xl p-4">
              <div className="text-white/40 text-xs uppercase mb-1">With Endpoints</div>
              <div className="text-2xl font-bold text-yellow-400">{stats.withEndpoints}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-[#111111] border border-white/10 rounded-xl p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Search */}
            <div className="sm:col-span-1">
              <label className="block text-white/60 text-sm mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Address, name, description..."
                  className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-white/60 text-sm mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'all' | 'verified' | 'claimed' | 'discovered')
                }
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50"
              >
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="claimed">Claimed</option>
                <option value="discovered">Discovered</option>
              </select>
            </div>

            {/* Endpoints Filter */}
            <div>
              <label className="block text-white/60 text-sm mb-2">Endpoints</label>
              <select
                value={hasEndpointsFilter}
                onChange={(e) => setHasEndpointsFilter(e.target.value as 'all' | 'yes' | 'no')}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50"
              >
                <option value="all">All Agents</option>
                <option value="yes">With Endpoints</option>
                <option value="no">Without Endpoints</option>
              </select>
            </div>
          </div>

          <div className="mt-4 text-white/40 text-sm">
            Showing {filteredAgents?.length || 0} of {stats.total} agents
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Agents Grid */}
        {!isLoading && filteredAgents.length === 0 && (
          <div className="text-center py-20">
            <Bot className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No agents found matching your filters</p>
          </div>
        )}

        {!isLoading && filteredAgents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent) => {
              const hasEndpoints = agentsWithEndpoints.has(agent.ghostAddress)

              return (
                <button
                  key={agent._id}
                  onClick={() => router.push(`/agents/${agent.ghostAddress}`)}
                  className="bg-[#111111] border border-white/10 rounded-xl p-5 text-left hover:border-white/20 hover:bg-[#151515] transition-all"
                >
                  <div className="flex items-start gap-4 mb-3">
                    <div className="p-2 bg-white/5 rounded-lg shrink-0">
                      <Bot className="w-6 h-6 text-white/60" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-medium text-white truncate">
                          {agent.name || 'Unnamed Agent'}
                        </h3>

                        {agent.status === 'verified' && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400 shrink-0">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </div>
                        )}

                        {agent.status === 'claimed' && (
                          <div className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded text-xs text-cyan-400 shrink-0">
                            Claimed
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-white/40 font-mono truncate">
                        {agent.ghostAddress.slice(0, 16)}...{agent.ghostAddress.slice(-8)}
                      </p>
                    </div>
                  </div>

                  {agent.description && (
                    <p className="text-white/60 text-sm mb-3 line-clamp-2">{agent.description}</p>
                  )}

                  <div className="flex items-center justify-between gap-4 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-4 text-xs text-white/40">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>{hasEndpoints ? 'Has Endpoints' : 'No Endpoints'}</span>
                      </div>

                      {agent.discoverySource && (
                        <div className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          <span className="capitalize">
                            {agent.discoverySource.replace(/_/g, ' ')}
                          </span>
                        </div>
                      )}
                    </div>

                    <ExternalLink className="w-4 h-4 text-white/40" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
