/**
 * x402 Agent Discovery Page
 *
 * Advanced agent search and discovery with x402 pricing
 */

'use client'

import React, { useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { CapabilityFilter, X402AgentGrid, PricingComparison } from '@/components/x402'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useX402AgentDiscovery, useX402AgentPriceComparison } from '@/lib/hooks/useX402'
import type { AgentSearchParams } from '@/lib/ghostspeak'

export default function X402DiscoveryPage(): React.JSX.Element {
  const [filters, setFilters] = useState<AgentSearchParams>({ sortBy: 'reputation' })
  const [compareCapability, setCompareCapability] = useState<string>('text-generation')

  const { data: searchResults, isLoading: searchLoading } = useX402AgentDiscovery(filters)
  const { data: priceComparison, isLoading: comparisonLoading } = useX402AgentPriceComparison(
    compareCapability
  )

  const agents = searchResults?.agents ?? []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8" />
            Discover x402 Agents
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Find AI agents with instant micropayment capabilities
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="search" className="gap-2">
              <Search className="w-4 h-4" />
              Search Agents
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Compare Prices
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Search & Filter
                </CardTitle>
                <CardDescription>
                  Find agents by capability, price, and performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CapabilityFilter
                  onFilterChange={setFilters}
                  popularCapabilities={[
                    'text-generation',
                    'code-generation',
                    'data-analysis',
                    'image-processing',
                    'translation',
                    'summarization'
                  ]}
                />
              </CardContent>
            </Card>

            {/* Results */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600 dark:text-gray-400">
                  {searchLoading
                    ? 'Searching...'
                    : `${agents.length} agent${agents.length !== 1 ? 's' : ''} found`}
                </p>
              </div>

              <X402AgentGrid
                agents={agents}
                isLoading={searchLoading}
                emptyMessage="No agents match your search criteria"
              />
            </div>
          </TabsContent>

          {/* Price Comparison Tab */}
          <TabsContent value="compare" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Price Comparison</CardTitle>
                <CardDescription>
                  Compare pricing across agents with the same capability
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Capability Selector */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Select Capability
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'text-generation',
                        'code-generation',
                        'data-analysis',
                        'image-processing',
                        'translation'
                      ].map((capability) => (
                        <button
                          key={capability}
                          onClick={() => setCompareCapability(capability)}
                          className={`
                            px-4 py-2 rounded-lg text-sm font-medium transition-all
                            ${
                              compareCapability === capability
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                                : 'glass hover:bg-gray-100 dark:hover:bg-gray-800'
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
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Loading comparison...
                      </p>
                    </div>
                  ) : priceComparison && priceComparison.agents.length > 0 ? (
                    <PricingComparison
                      agents={priceComparison.agents.map((agent: any) => ({
                        address: agent.address,
                        name: agent.name,
                        pricing: agent.pricing
                      }))}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-600 dark:text-gray-400">
                        No agents found with this capability
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
