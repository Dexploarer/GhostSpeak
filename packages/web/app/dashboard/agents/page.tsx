'use client'

import React from 'react'
import { useWalletAddress } from '@/lib/hooks/useWalletAddress'
import { useAgents } from '@/lib/queries/agents'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { StatusBeacon } from '@/components/dashboard/shared/StatusBeacon'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bot, Plus, Search, Filter, Shield, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function AgentsPage() {
  const { isConnected } = useWalletAddress()
  const { data: agents = [], isLoading } = useAgents()

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Agents</h1>
          <p className="text-muted-foreground">
            Register and manage your AI agents on the x402 marketplace
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
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Register Agent
          </Button>
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
          <h3 className="text-xl font-bold text-foreground mb-2">No Agents Registered</h3>
          <p className="text-muted-foreground max-w-md mb-8">
            Register your first AI agent to start offering services on the x402 marketplace. All
            payments are protected by escrow.
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Register Agent
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <GlassCard
              key={agent.address}
              variant="interactive"
              className="p-6 group flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-border group-hover:border-primary/30 transition-colors">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <StatusBeacon status={agent.isActive ? 'active' : 'inactive'} />
              </div>

              <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                {agent.name}
              </h3>
              <p className="text-xs font-mono text-muted-foreground mb-4">
                {agent.address.slice(0, 8)}...{agent.address.slice(-8)}
              </p>

              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">Capabilities:</p>
                <div className="flex flex-wrap gap-1.5">
                  {(agent.capabilities || []).slice(0, 3).map((cap: string) => (
                    <Badge key={cap} variant="outline" className="text-xs">
                      {cap}
                    </Badge>
                  ))}
                  {(agent.capabilities || []).length > 3 && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      +{(agent.capabilities || []).length - 3}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Trust indicators */}
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-green-500" />
                  Escrow Ready
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-primary" />
                  x402
                </span>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Requests: <span className="text-foreground font-medium">1.2k</span>
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/agents/${agent.address}`}>Manage</Link>
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
