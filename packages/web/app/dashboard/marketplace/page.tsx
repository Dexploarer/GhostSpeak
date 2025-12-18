'use client'

import React from 'react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { ShoppingCart, Hammer, Tag, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMarketplaceListings, MarketplaceListing } from '@/lib/queries/marketplace'
import { format } from 'date-fns'

export default function MarketplacePage() {
  const { data: listings = [], isLoading } = useMarketplaceListings()

  // Fallback mock data if no real listings are found (Hybrid approach)
  const displayListings = listings.length > 0 ? listings : [
    {
      address: 'mock-1',
      name: 'Arbitrage Specialist',
      description: 'High-frequency trading agent specialized in DEX arbitrage.',
      price: BigInt(4200000000), // 4.2 SOL
      sellerName: 'TraderBot',
      tags: ['DeFi', 'Trading'],
      createdAt: new Date(),
    },
    {
      address: 'mock-2',
      name: 'Content Generator',
      description: 'AI agent for generating high-quality SEO blog posts.',
      price: BigInt(1500000000), // 1.5 SOL
      sellerName: 'ContentAI',
      tags: ['Content', 'SEO'],
      createdAt: new Date(),
    },
    {
      address: 'mock-3',
      name: 'Smart Auditor',
      description: 'Automated smart contract security auditor.',
      price: BigInt(10000000000), // 10 SOL
      sellerName: 'SecureChain',
      tags: ['Security', 'Audit'],
      createdAt: new Date(),
    },
    {
      address: 'mock-4',
      name: 'Data Analyst',
      description: 'Processes large datasets and provides actionable insights.',
      price: BigInt(2000000000), // 2 SOL
      sellerName: 'DataMind',
      tags: ['Data', 'Analytics'],
      createdAt: new Date(),
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Agent Marketplace</h1>
        <p className="text-gray-400">Buy, sell, and hire autonomous agents</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
         {/* Featured Card */}
         <GlassCard className="col-span-1 lg:col-span-2 p-8 relative overflow-hidden bg-linear-to-br from-lime-900/40 to-gray-900/40">
            <div className="absolute top-0 right-0 p-12 opacity-10">
               <ShoppingCart className="w-48 h-48 text-lime-500" />
            </div>
            <div className="relative z-10 max-w-lg">
               <h2 className="text-3xl font-bold text-white mb-4">Premium Agents Collection</h2>
               <p className="text-gray-300 mb-6 text-lg">
                  Discover top-tier agents verified for financial modeling, content generation, and complex problem solving.
               </p>
               <Button className="bg-lime-500 text-black font-bold hover:bg-lime-400">
                  Browse Collection <ArrowRight className="w-4 h-4 ml-2" />
               </Button>
            </div>
         </GlassCard>

         <GlassCard className="p-6 flex flex-col justify-center items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mb-2">
               <Hammer className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold text-white">List Your Agent</h3>
            <p className="text-gray-400 text-sm">
               Monetize your creation by listing it on the open marketplace.
            </p>
            <Button variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 w-full">
               Create Listing
            </Button>
         </GlassCard>
      </div>

      <h3 className="text-lg font-semibold text-white mb-4">
        {listings.length > 0 ? 'Latest Listings' : 'Trending (Preview)'}
      </h3>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {[1,2,3,4].map(i => (
             <GlassCard key={i} className="h-[280px] animate-pulse bg-white/5" />
           ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {displayListings.map((listing: any, i: number) => (
              <GlassCard key={listing.address || i} variant="interactive" className="p-4 group flex flex-col">
                 <div className="aspect-video rounded-lg bg-gray-800 mb-4 relative overflow-hidden">
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 left-2">
                       <span className="px-2 py-1 rounded bg-black/40 backdrop-blur-md text-xs text-white border border-white/10">
                          @{listing.sellerName || 'Unknown'}
                       </span>
                    </div>
                 </div>
                 <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-100 truncate pr-2">{listing.name}</h4>
                    <div className="flex items-center text-lime-400 text-sm font-mono whitespace-nowrap">
                       <Tag className="w-3 h-3 mr-1" /> 
                       {(Number(listing.price) / 1e9).toFixed(2)} SOL
                    </div>
                 </div>
                 <p className="text-xs text-gray-500 mb-4 line-clamp-2 flex-1">{listing.description}</p>
                 <Button size="sm" className="w-full bg-white/5 hover:bg-white/10 text-gray-300 mt-auto">View Details</Button>
              </GlassCard>
           ))}
        </div>
      )}
    </div>
  )
}