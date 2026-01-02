'use client'

import React from 'react'
import { useWalletAddress } from '@/lib/hooks/useAuth'
import { useQuery as useConvexQuery, usePaginatedQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { StatusBeacon } from '@/components/dashboard/shared/StatusBeacon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bot, Plus, Search, Filter, Shield, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { RegisterAgentModal } from '@/components/dashboard/agents/RegisterAgentModal'

export default function AgentsPage() {
  const { isConnected } = useWalletAddress()

  // Use Convex paginated query for real-time reactive agent list
  const {
    results: agents,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.agentsDashboard.listAgentsWithScores,
    {},
    { initialNumItems: 20 }
  )

  const isLoading = status === 'LoadingFirstPage'

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">My Agents</h1>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs font-mono uppercase tracking-wider border border-amber-500/20">
              Demo • Devnet
            </span>
          </div>
          <p className="text-muted-foreground">
            Register and manage your AI agents.{' '}
            <span className="text-amber-500/80 text-sm">Transactions are on Solana Devnet.</span>
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search agents..."
              className="pl-9 pr-4 py-2 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary/50 focus:bg-muted/80 transition-all w-64"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Link href="/dashboard/privacy">
            <Button variant="outline">
              <Shield className="w-4 h-4 mr-2" />
              Privacy
            </Button>
          </Link>
          <RegisterAgentModal onSuccess={() => {}}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Register Agent
            </Button>
          </RegisterAgentModal>
        </div>
      </div>

      {!isConnected ? (
        <GlassCard className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Bot className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground max-w-md mb-8">
            Connect your wallet to view and manage your registered agents.
          </p>
        </GlassCard>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <GlassCard key={i} className="h-[200px] animate-pulse" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <GlassCard className="p-16 flex flex-col items-center justify-center text-center border-dashed">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Bot className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No Agents Discovered</h3>
          <p className="text-muted-foreground max-w-md mb-8">
            Agents are automatically discovered from x402 payment transactions. Once discovered, you can claim them
            to build verifiable credentials and Ghost Score reputation.
          </p>
          <Link href="/claim">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Claim a Ghost
            </Button>
          </Link>
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <GlassCard
                key={agent.ghostAddress}
                variant="interactive"
                className="p-6 group flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-border group-hover:border-primary/30 transition-colors">
                    <Bot className="w-6 h-6 text-primary" />
                  </div>
                  <StatusBeacon
                    status={agent.status === 'claimed' || agent.status === 'verified' ? 'active' : 'inactive'}
                  />
                </div>

                <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {agent.ghostAddress.slice(0, 8)}...
                </h3>
                <p className="text-xs font-mono text-muted-foreground mb-4">
                  {agent.ghostAddress.slice(0, 8)}...{agent.ghostAddress.slice(-8)}
                </p>

                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">Ghost Score:</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">
                      {agent.ghostScore ?? 0}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {agent.tier ?? 'Newcomer'}
                    </Badge>
                  </div>
                </div>

                {/* Trust indicators */}
                <div className="mt-4 pt-4 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-green-500" />
                    {agent.status === 'claimed' ? 'Claimed' : agent.status}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-primary" />
                    x402
                  </span>
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Jobs: <span className="text-foreground font-medium">{agent.totalJobs ?? 0}</span>
                  </span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/ghost-score/${agent.ghostAddress}`}>View</Link>
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Load More Button */}
          {status === 'CanLoadMore' && (
            <div className="flex justify-center mt-8">
              <Button onClick={() => loadMore(20)} variant="outline">
                <ChevronRight className="w-4 h-4 mr-2" />
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
