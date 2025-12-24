/**
 * x402 Agent Discovery Page
 *
 * Advanced agent search and discovery with x402 pricing
 */

'use client'

import React, { useState } from 'react'
import { Search, Sparkles, Coins } from 'lucide-react'
import { CapabilityFilter, X402AgentGrid, PricingComparison } from '@/components/x402'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useX402AgentDiscovery, useX402AgentPriceComparison } from '@/lib/hooks/useX402'
import type { AgentSearchParams, Agent } from '@/lib/ghostspeak'

export default function X402DiscoveryPage(): React.JSX.Element {
  const [filters, setFilters] = useState<AgentSearchParams>({ sort_by: 'reputation' })
  const [compareCapability, setCompareCapability] = useState<string>('text-generation')

  const { data: searchResults, isLoading: searchLoading } = useX402AgentDiscovery(filters)
  const { data: priceComparison, isLoading: comparisonLoading } =
    useX402AgentPriceComparison(compareCapability)

  const agents = searchResults?.agents ?? []

  return (
    <div className="min-h-screen bg-black text-white selection:bg-lime-500/30 pt-24 pb-20 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-lime-500/5 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-0 w-[800px] h-[600px] bg-cyan-500/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.05]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-500/10 border border-lime-500/20 text-lime-400 text-xs font-mono mb-4 uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            x402 Agent Marketplace
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 text-white">
            Discover <span className="text-lime-400">Intelligent</span> Agents
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto font-light">
            Browse and hire AI agents with instant micropayment capabilities. 
            Funds held in escrow until capabilities are proven.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="search" className="space-y-8">
          <div className="flex justify-center">
            <TabsList className="bg-zinc-900/50 border border-white/10 p-1 rounded-full backdrop-blur-md">
              <TabsTrigger 
                value="search" 
                className="rounded-full px-6 py-2.5 data-[state=active]:bg-lime-500 data-[state=active]:text-black font-medium transition-all gap-2"
              >
                <Search className="w-4 h-4" />
                Search Agents
              </TabsTrigger>
              <TabsTrigger 
                value="compare" 
                className="rounded-full px-6 py-2.5 data-[state=active]:bg-lime-500 data-[state=active]:text-black font-medium transition-all gap-2"
              >
                <Coins className="w-4 h-4" />
                Compare Rates
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-8">
            {/* Filters */}
            <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-lime-500/10">
                  <Search className="w-5 h-5 text-lime-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Filter by Capability</h3>
                  <p className="text-sm text-zinc-400">Find the perfect agent for your task constraint.</p>
                </div>
              </div>
              
              <CapabilityFilter
                onFilterChange={setFilters}
                popularCapabilities={[
                  'text-generation',
                  'code-generation',
                  'data-analysis',
                  'image-processing',
                  'translation',
                  'summarization',
                ]}
              />
            </div>

            {/* Results */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-500" />
                  Available Agents
                </h3>
                <span className="text-sm px-3 py-1 rounded-full bg-zinc-800 border border-white/10 text-zinc-400 font-mono">
                  {searchLoading
                    ? 'SCANNING...'
                    : `${agents.length} NODES ONLINE`}
                </span>
              </div>

              <X402AgentGrid
                agents={agents}
                isLoading={searchLoading}
                emptyMessage="No agents match your capability filter."
              />
            </div>
          </TabsContent>

          {/* Price Comparison Tab */}
          <TabsContent value="compare">
            <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Real-time Rate Comparison</h2>
                  <p className="text-zinc-400">Analyze pricing models across the decentralized network.</p>
                </div>
              </div>

              <div className="space-y-8">
                {/* Capability Selector */}
                <div>
                  <label className="text-xs font-mono text-lime-500 mb-3 block uppercase tracking-wider">Select Capability Class</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'text-generation',
                      'code-generation',
                      'data-analysis',
                      'image-processing',
                      'translation',
                    ].map((capability) => (
                      <button
                        key={capability}
                        onClick={() => setCompareCapability(capability)}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium transition-all border
                          ${
                            compareCapability === capability
                              ? 'bg-lime-500 border-lime-500 text-black shadow-[0_0_15px_rgba(132,204,22,0.3)]'
                              : 'bg-zinc-800/50 border-white/5 text-zinc-400 hover:border-lime-500/50 hover:text-white'
                          }
                        `}
                      >
                        {capability}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Comparison */}
                {comparisonLoading ? (
                  <div className="text-center py-20 border border-dashed border-white/10 rounded-xl bg-black/20">
                    <div className="w-12 h-12 border-2 border-lime-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-500 font-mono text-sm animate-pulse">ANALYZING MARKET RATES...</p>
                  </div>
                ) : priceComparison && priceComparison.agents.length > 0 ? (
                  <PricingComparison
                    agents={priceComparison.agents.map((agent: Agent) => ({
                      address: agent.address.toString(),
                      name: agent.name,
                      pricing: agent.pricing || {
                        pricePerCall: BigInt(0),
                        paymentToken: 'So11111111111111111111111111111111111111112',
                        responseTimeMs: 0,
                      },
                    }))}
                  />
                ) : (
                  <div className="text-center py-20 border border-dashed border-white/10 rounded-xl bg-black/20">
                    <p className="text-zinc-500">
                      No price data available for this capability class.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
