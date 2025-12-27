/**
 * x402 Bazaar Discovery Page
 *
 * Browse and interact with real x402 services from the ecosystem
 * Supports Heurist Mesh, Firecrawl, Pinata, and GhostSpeak native
 */

'use client'

import React, { useState } from 'react'
import { Search, Sparkles, Grid3X3, List, RefreshCw } from 'lucide-react'
import { X402ResourceGrid } from '@/components/x402'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useX402Resources,
  X402_CATEGORIES,
  type X402Category,
  type X402ResourceFilters,
} from '@/lib/hooks/useX402Resources'

export default function X402BazaarPage(): React.JSX.Element {
  const [filters, setFilters] = useState<X402ResourceFilters>({
    pageSize: 50,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<X402Category>('all')

  const { data, isLoading, refetch, isFetching } = useX402Resources({
    ...filters,
    query: searchQuery || undefined,
    category: selectedCategory === 'all' ? undefined : selectedCategory,
  })

  const resources = data?.resources ?? []
  const sources = data?.sources ?? { heurist: 0, ghostspeak: 0, other: 0 }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters((prev) => ({ ...prev, query: searchQuery }))
  }

  const handleCategoryChange = (category: X402Category) => {
    setSelectedCategory(category)
  }

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
        <div className="mb-8 sm:mb-12 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-500/10 border border-lime-500/20 text-lime-400 text-xs font-mono mb-4 uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            x402 Bazaar
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter mb-4 text-white">
            AI Services <span className="text-lime-400">Marketplace</span>
          </h1>
          <p className="text-sm sm:text-lg text-zinc-400 max-w-2xl mx-auto font-light">
            Browse {data?.total ?? '...'} live x402 services. Pay-per-use with USDC.
            No API keys. No subscriptions.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <Badge
            variant="outline"
            className="bg-purple-500/10 text-purple-400 border-purple-500/30 px-3 py-1"
          >
            🔮 {sources.heurist} Heurist Agents
          </Badge>
          <Badge
            variant="outline"
            className="bg-lime-500/10 text-lime-400 border-lime-500/30 px-3 py-1"
          >
            👻 {sources.ghostspeak} GhostSpeak
          </Badge>
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-400 border-blue-500/30 px-3 py-1"
          >
            🔧 {sources.other} Other Services
          </Badge>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search services..."
                className="pl-10 bg-zinc-900/50 border-white/10 focus:border-lime-500/50"
              />
            </div>
            <Button type="submit" className="bg-lime-500 text-black hover:bg-lime-400">
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              className="border-white/10"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </form>

        {/* Category Filters */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max justify-center sm:flex-wrap">
            {X402_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`
                  px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all border whitespace-nowrap
                  ${
                    selectedCategory === category.id
                      ? 'bg-lime-500 border-lime-500 text-black shadow-[0_0_15px_rgba(132,204,22,0.3)]'
                      : 'bg-zinc-800/50 border-white/5 text-zinc-400 hover:border-lime-500/50 hover:text-white'
                  }
                `}
              >
                <span className="mr-1">{category.icon}</span>
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-pulse" />
            {selectedCategory === 'all' ? 'All Services' : X402_CATEGORIES.find(c => c.id === selectedCategory)?.label}
          </h3>
          <span className="text-sm px-3 py-1 rounded-full bg-zinc-800 border border-white/10 text-zinc-400 font-mono">
            {isLoading ? 'LOADING...' : `${resources.length} SERVICES`}
          </span>
        </div>

        {/* Results Grid */}
        <X402ResourceGrid
          resources={resources}
          isLoading={isLoading}
          emptyMessage={`No services found${searchQuery ? ` for "${searchQuery}"` : ''}`}
        />

        {/* Load More */}
        {data?.hasMore && (
          <div className="text-center mt-8">
            <Button
              variant="outline"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  pageSize: (prev.pageSize ?? 50) + 50,
                }))
              }
              className="border-white/10"
            >
              Load More Services
            </Button>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 text-center text-xs text-zinc-600">
          <p>
            Services are aggregated from Heurist Mesh, Firecrawl, Pinata, and GhostSpeak.
          </p>
          <p className="mt-1">
            All payments are processed via x402 protocol on Base or Solana networks.
          </p>
        </div>
      </div>
    </div>
  )
}
