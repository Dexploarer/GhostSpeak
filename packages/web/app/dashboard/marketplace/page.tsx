'use client'

import React from 'react'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { ShoppingCart, Hammer, Tag, ArrowRight, Shield, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMarketplaceListings } from '@/lib/queries/marketplace'
import Link from 'next/link'

export default function MarketplacePage() {
  const { data: listings = [], isLoading } = useMarketplaceListings()

  // Display listings or preview data
  const displayListings = listings.length > 0 ? listings : [
    {
      address: 'preview-1',
      name: 'Code Review Agent',
      description: 'AI agent for automated code reviews with security analysis.',
      price: BigInt(5000000), // 5 USDC (6 decimals)
      sellerName: 'DevTools',
      reputation: 4.9,
      tags: ['Development', 'Security'],
      createdAt: new Date(),
    },
    {
      address: 'preview-2',
      name: 'Content Generator',
      description: 'AI agent for generating high-quality SEO blog posts.',
      price: BigInt(2500000), // 2.5 USDC
      sellerName: 'ContentAI',
      reputation: 4.7,
      tags: ['Content', 'SEO'],
      createdAt: new Date(),
    },
    {
      address: 'preview-3',
      name: 'Data Analyst',
      description: 'Processes datasets and provides actionable insights.',
      price: BigInt(10000000), // 10 USDC
      sellerName: 'DataMind',
      reputation: 4.8,
      tags: ['Data', 'Analytics'],
      createdAt: new Date(),
    },
    {
      address: 'preview-4',
      name: 'Translation Agent',
      description: 'Real-time translation for 50+ languages.',
      price: BigInt(1000000), // 1 USDC
      sellerName: 'LangAI',
      reputation: 4.6,
      tags: ['Language', 'Translation'],
      createdAt: new Date(),
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Agent Marketplace</h1>
        <p className="text-muted-foreground">Discover x402 agents. Pay per call. Protected by escrow.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
         {/* Featured Card */}
         <GlassCard className="col-span-1 lg:col-span-2 p-8 relative overflow-hidden bg-linear-to-br from-primary/10 to-secondary/20">
            <div className="absolute top-0 right-0 p-12 opacity-10">
               <ShoppingCart className="w-48 h-48 text-primary" />
            </div>
            <div className="relative z-10 max-w-lg">
               <div className="flex items-center gap-2 mb-4">
                 <Shield className="w-5 h-5 text-green-500" />
                 <span className="text-sm text-green-500 font-medium">Escrow Protected</span>
               </div>
               <h2 className="text-3xl font-bold text-foreground mb-4">x402 Agent Marketplace</h2>
               <p className="text-muted-foreground mb-6 text-lg">
                  Pay agents per call with USDC. Funds held in escrow until delivery. 
                  Dispute resolution if anything goes wrong.
               </p>
               <Button asChild>
                  <Link href="/x402/discover">
                    Browse All Agents <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
               </Button>
            </div>
         </GlassCard>

         <GlassCard className="p-6 flex flex-col justify-center items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mb-2">
               <Hammer className="w-8 h-8 text-cyan-500" />
            </div>
            <h3 className="text-xl font-bold text-foreground">List Your Agent</h3>
            <p className="text-muted-foreground text-sm">
               Monetize your AI agent with x402 micropayments and escrow protection.
            </p>
            <Button variant="outline" className="w-full" asChild>
               <Link href="/dashboard/agents">Create Listing</Link>
            </Button>
         </GlassCard>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-4">
        {listings.length > 0 ? 'Latest Listings' : 'Featured Agents (Preview)'}
      </h3>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {[1,2,3,4].map(i => (
             <GlassCard key={i} className="h-[280px] animate-pulse" />
           ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {displayListings.map((listing: any, i: number) => (
              <GlassCard key={listing.address || i} variant="interactive" className="p-4 group flex flex-col">
                 <div className="aspect-video rounded-lg bg-linear-to-br from-muted to-muted/50 mb-4 relative overflow-hidden flex items-center justify-center">
                    <ShoppingCart className="w-12 h-12 text-muted-foreground/30" />
                    <div className="absolute bottom-2 left-2">
                       <span className="px-2 py-1 rounded bg-background/80 backdrop-blur-md text-xs text-foreground border border-border">
                          @{listing.sellerName || 'Unknown'}
                       </span>
                    </div>
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-background/80 backdrop-blur-md text-xs">
                       <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                       <span className="text-foreground">{listing.reputation || '4.5'}</span>
                    </div>
                 </div>
                 <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-foreground truncate pr-2">{listing.name}</h4>
                    <div className="flex items-center text-primary text-sm font-mono whitespace-nowrap">
                       <Tag className="w-3 h-3 mr-1" /> 
                       {(Number(listing.price) / 1e6).toFixed(2)} USDC
                    </div>
                 </div>
                 <p className="text-xs text-muted-foreground mb-3 line-clamp-2 flex-1">{listing.description}</p>
                 
                 {/* Trust indicator */}
                 <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                   <Shield className="w-3 h-3 text-green-500" />
                   <span>Escrow Protected</span>
                 </div>
                 
                 <Button size="sm" className="w-full mt-auto">Pay & Use</Button>
              </GlassCard>
           ))}
        </div>
      )}
    </div>
  )
}
