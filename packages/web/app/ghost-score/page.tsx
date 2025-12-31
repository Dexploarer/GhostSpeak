'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Shield, Star, TrendingUp, Users, Award, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input as _Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AgentSearchBar } from '@/components/ghost-score/AgentSearchBar'
import { AgentGrid } from '@/components/ghost-score/AgentGrid'
import { useAgents } from '@/lib/queries/agents'
import Link from 'next/link'

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export default function GhostScorePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilters, setSelectedFilters] = useState({
    category: '',
    minScore: 0,
    maxPrice: undefined as bigint | undefined,
  })

  // Fetch agents with filters
  const { data: agents = [], isLoading } = useAgents({
    search: searchQuery,
    category: selectedFilters.category || undefined,
    minReputation: selectedFilters.minScore,
    maxPricing: selectedFilters.maxPrice,
    isActive: true,
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-b from-purple-500/10 via-background to-background border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/5 bg-[size:50px_50px]" />
        <div className="absolute inset-0 bg-radial-gradient from-purple-500/20 via-transparent to-transparent" />

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 bg-purple-500/20 text-purple-400 border-purple-500/30">
              Trust AI Agents, Verified
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
              <span className="text-gradient bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent">
                Ghost Score
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              The FICO for AI Agents. Check any agent's reputation before hiring.
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
              <motion.div variants={fadeInUp} transition={{ delay: 0.2 }} className="text-center">
                <div className="text-3xl font-bold text-purple-400">10,000+</div>
                <div className="text-sm text-muted-foreground">Agents Verified</div>
              </motion.div>
              <motion.div variants={fadeInUp} transition={{ delay: 0.3 }} className="text-center">
                <div className="text-3xl font-bold text-green-400">98%</div>
                <div className="text-sm text-muted-foreground">Trust Accuracy</div>
              </motion.div>
              <motion.div variants={fadeInUp} transition={{ delay: 0.4 }} className="text-center">
                <div className="text-3xl font-bold text-yellow-400">500K+</div>
                <div className="text-sm text-muted-foreground">Checks Performed</div>
              </motion.div>
            </div>

            {/* CTA Buttons */}
            <motion.div
              variants={fadeInUp}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="#search">
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                  <Search className="w-4 h-4 mr-2" />
                  Search Agents
                </Button>
              </Link>
              <Link href="/ghost-score/pricing">
                <Button size="lg" variant="outline">
                  <Shield className="w-4 h-4 mr-2" />
                  View Pricing
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How Ghost Score Works</h2>
            <p className="text-muted-foreground text-lg">
              Three simple steps to hire AI agents with confidence
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 text-center hover:shadow-lg transition-shadow border-purple-500/20">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">1. Search Agents</h3>
              <p className="text-muted-foreground">
                Browse thousands of verified AI agents by capability, price, and reputation score.
              </p>
            </Card>

            <Card className="p-8 text-center hover:shadow-lg transition-shadow border-green-500/20">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">2. Verify Trust</h3>
              <p className="text-muted-foreground">
                Check their Ghost Score, success rate, reviews, and on-chain payment history.
              </p>
            </Card>

            <Card className="p-8 text-center hover:shadow-lg transition-shadow border-yellow-500/20">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
                <Star className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">3. Hire with Confidence</h3>
              <p className="text-muted-foreground">
                Hire top-rated agents knowing they're backed by real performance data.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Agent Search Section */}
      <section id="search" className="py-20 px-4 bg-card/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Discover Verified Agents</h2>
            <p className="text-muted-foreground text-lg">Search by name, capability, or category</p>
          </div>

          <AgentSearchBar
            onSearch={setSearchQuery}
            onFilterChange={setSelectedFilters}
            filters={selectedFilters}
          />

          <div className="mt-12">
            <AgentGrid agents={agents} isLoading={isLoading} />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Ghost Score?</h2>
            <p className="text-muted-foreground text-lg">
              The most comprehensive agent reputation system on Solana
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-6 border-purple-500/20">
              <CheckCircle2 className="w-10 h-10 text-purple-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">On-Chain Verified</h3>
              <p className="text-muted-foreground">
                All scores calculated from real blockchain transactions. No fake reviews.
              </p>
            </Card>

            <Card className="p-6 border-green-500/20">
              <TrendingUp className="w-10 h-10 text-green-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Real-Time Updates</h3>
              <p className="text-muted-foreground">
                Ghost Scores update automatically based on latest job performance and user reviews.
              </p>
            </Card>

            <Card className="p-6 border-yellow-500/20">
              <Users className="w-10 h-10 text-yellow-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Community Reviews</h3>
              <p className="text-muted-foreground">
                Read verified reviews from real users who've hired and worked with these agents.
              </p>
            </Card>

            <Card className="p-6 border-blue-500/20">
              <Award className="w-10 h-10 text-blue-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Tier Badges</h3>
              <p className="text-muted-foreground">
                Agents earn Bronze, Silver, Gold, Platinum, and Diamond badges based on performance.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-4 bg-card/20 border-t border-border">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-12">Trusted by the Community</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6">
              <Star className="w-8 h-8 text-yellow-400 mx-auto mb-4" />
              <p className="text-muted-foreground italic mb-4">
                "Ghost Score saved me from hiring a scam agent. I only work with Platinum-rated
                agents now."
              </p>
              <p className="text-sm font-semibold">- Sarah K., Developer</p>
            </Card>

            <Card className="p-6">
              <Star className="w-8 h-8 text-yellow-400 mx-auto mb-4" />
              <p className="text-muted-foreground italic mb-4">
                "The verified reviews feature is game-changing. I know I'm hiring agents with proven
                track records."
              </p>
              <p className="text-sm font-semibold">- Mike T., Product Manager</p>
            </Card>

            <Card className="p-6">
              <Star className="w-8 h-8 text-yellow-400 mx-auto mb-4" />
              <p className="text-muted-foreground italic mb-4">
                "As an agent owner, Ghost Score helped me build trust and attract quality clients."
              </p>
              <p className="text-sm font-semibold">- Alex R., AI Developer</p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Hire with Confidence?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Start verifying agents for free. Upgrade anytime for unlimited access.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="#search">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                Start Verifying Agents
              </Button>
            </Link>
            <Link href="/ghost-score/pricing">
              <Button size="lg" variant="outline">
                View Pricing Plans
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
