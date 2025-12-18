'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  Zap, 
  Shield, 
  Users, 
  Rocket, 
  Code, 
  Vote, 
  TrendingUp,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Lock,
  Coins,
  BarChart3,
  Globe,
  Bot,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { GhostIcon } from '@/components/shared/GhostIcon'

const tokenAllocations = [
  { 
    name: 'Public Launch', 
    percentage: 80, 
    color: 'bg-primary', 
    description: 'Fair launch via pump.fun bonding curve',
    icon: Users
  },
  { 
    name: 'Team & Dev', 
    percentage: 10, 
    color: 'bg-emerald-500', 
    description: '12-month linear vesting',
    icon: Code
  },
  { 
    name: 'Treasury', 
    percentage: 5, 
    color: 'bg-sky-500', 
    description: 'Protocol development & operations',
    icon: Shield
  },
  { 
    name: 'Ecosystem', 
    percentage: 5, 
    color: 'bg-purple-500', 
    description: 'Grants, bounties & rewards',
    icon: Sparkles
  },
]

const useOfFunds = [
  { label: 'Mainnet Deployment', amount: '~50 SOL', percentage: 25 },
  { label: 'Security Audit', amount: '~$50-100k', percentage: 35 },
  { label: 'Developer Operations', amount: 'Ongoing', percentage: 25 },
  { label: 'Marketing & Growth', amount: 'Strategic', percentage: 15 },
]

const utilityPhases = [
  {
    phase: 'Phase 1',
    title: 'Launch',
    status: 'upcoming',
    items: [
      'Governance voting rights',
      'Community access',
      'Early supporter recognition',
    ]
  },
  {
    phase: 'Phase 2',
    title: 'Integration',
    status: 'planned',
    items: [
      'Agent registration staking',
      'Fee discounts (20% off)',
      'Priority marketplace access',
    ]
  },
  {
    phase: 'Phase 3',
    title: 'Ecosystem',
    status: 'planned',
    items: [
      'Reputation staking & slashing',
      'Dispute resolution jury',
      'Revenue sharing to stakers',
    ]
  },
]

export default function TokenomicsPage() {
  const [activeAllocation, setActiveAllocation] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[150px]" />
        </div>

        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            {/* Token Badge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/10 border border-primary/20 mb-8"
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <GhostIcon variant="logo" size={24} className="text-primary-foreground" />
              </div>
              <span className="text-2xl font-black text-primary">$GHOST</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
              Powering the <br />
              <span className="text-primary">AI Agent Economy</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
              $GHOST is the governance and utility token for the GhostSpeak Protocol — 
              the x402 payment layer enabling autonomous AI agents to transact on Solana.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-xl shadow-[0_0_40px_-10px] shadow-primary/50">
                <Rocket className="w-5 h-5 mr-2" />
                Join Launch on Pump.fun
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
              <Link href="/docs">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-xl">
                  Read Documentation
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16"
          >
            {[
              { label: 'Total Supply', value: '1B', suffix: '$GHOST' },
              { label: 'Launch Type', value: 'Fair', suffix: 'Pump.fun' },
              { label: 'Team Vesting', value: '12', suffix: 'Months' },
              { label: 'Network', value: 'Solana', suffix: 'Mainnet' },
            ].map((stat, i) => (
              <div key={i} className="p-6 rounded-2xl bg-card/50 border border-border backdrop-blur-sm text-center">
                <div className="text-3xl font-black text-foreground">{stat.value}</div>
                <div className="text-xs text-primary font-bold uppercase tracking-wider">{stat.suffix}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Token Allocation Section */}
      <section className="py-24 border-t border-border">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
              Token <span className="text-primary">Allocation</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Fair distribution designed for long-term protocol success and community ownership.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Visual Pie Chart */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative aspect-square max-w-md mx-auto"
            >
              {/* Circular allocation visualization */}
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {tokenAllocations.reduce((acc, alloc, i) => {
                  const prevOffset = acc.offset
                  const circumference = 2 * Math.PI * 40
                  const strokeDasharray = (alloc.percentage / 100) * circumference
                  const strokeDashoffset = -prevOffset
                  
                  acc.elements.push(
                    <circle
                      key={i}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      strokeWidth="16"
                      className={cn(
                        alloc.color.replace('bg-', 'stroke-'),
                        'transition-all duration-300',
                        activeAllocation === i ? 'opacity-100' : activeAllocation !== null ? 'opacity-30' : 'opacity-100'
                      )}
                      strokeDasharray={`${strokeDasharray} ${circumference}`}
                      strokeDashoffset={strokeDashoffset}
                      onMouseEnter={() => setActiveAllocation(i)}
                      onMouseLeave={() => setActiveAllocation(null)}
                      style={{ cursor: 'pointer' }}
                    />
                  )
                  acc.offset += strokeDasharray
                  return acc
                }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
              </svg>
              
              {/* Center Content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <GhostIcon variant="logo" size={32} className="text-primary" />
                  </div>
                  <div className="text-2xl font-black">1B</div>
                  <div className="text-xs text-muted-foreground">Total Supply</div>
                </div>
              </div>
            </motion.div>

            {/* Allocation Details */}
            <div className="space-y-4">
              {tokenAllocations.map((alloc, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  onMouseEnter={() => setActiveAllocation(i)}
                  onMouseLeave={() => setActiveAllocation(null)}
                  className={cn(
                    "p-6 rounded-2xl border transition-all duration-300 cursor-pointer",
                    activeAllocation === i 
                      ? "bg-card border-primary/30 shadow-lg shadow-primary/10" 
                      : "bg-card/50 border-border hover:border-primary/20"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", alloc.color.replace('bg-', 'bg-') + '/20')}>
                      <alloc.icon className={cn("w-6 h-6", alloc.color.replace('bg-', 'text-'))} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-foreground">{alloc.name}</h3>
                        <span className={cn("text-2xl font-black", alloc.color.replace('bg-', 'text-'))}>
                          {alloc.percentage}%
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{alloc.description}</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${alloc.percentage}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
                      className={cn("h-full rounded-full", alloc.color)}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Use of Funds Section */}
      <section className="py-24 bg-card/30 border-t border-border">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
              Use of <span className="text-primary">Funds</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              100% transparency on how raised funds will be allocated to build and scale the protocol.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useOfFunds.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-card border border-border"
              >
                <div className="text-4xl font-black text-primary mb-2">{item.percentage}%</div>
                <h3 className="font-bold text-foreground mb-1">{item.label}</h3>
                <p className="text-sm text-muted-foreground">{item.amount}</p>
              </motion.div>
            ))}
          </div>

          {/* Detailed Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 p-8 rounded-3xl bg-card border border-border"
          >
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Detailed Breakdown
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="font-bold text-muted-foreground uppercase text-sm tracking-wider">Development</h4>
                <ul className="space-y-3">
                  {[
                    'Solana mainnet deployment (~50 SOL)',
                    'Program account rent (~20 SOL)',
                    'Security audit (OtterSec/Halborn)',
                    'Ongoing infrastructure costs',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-muted-foreground uppercase text-sm tracking-wider">Growth</h4>
                <ul className="space-y-3">
                  {[
                    'Developer grants & bounties',
                    'Strategic partnerships',
                    'Community marketing',
                    'Exchange listings',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Token Utility Section */}
      <section className="py-24 border-t border-border">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
              Token <span className="text-primary">Utility</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              $GHOST isn't just a token — it's the key to participating in the autonomous agent economy.
            </p>
          </motion.div>

          {/* Utility Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {[
              { icon: Vote, title: 'Governance', description: 'Vote on protocol upgrades, fee structures, and treasury allocation' },
              { icon: Lock, title: 'Agent Staking', description: 'Stake to register agents on-chain, signals trust and quality' },
              { icon: Coins, title: 'Fee Discounts', description: 'Pay protocol fees in $GHOST for 20% discount' },
              { icon: Shield, title: 'Dispute Resolution', description: 'Stakers can serve as arbitrators in escrow disputes' },
              { icon: TrendingUp, title: 'Revenue Sharing', description: 'Protocol fees distributed to long-term stakers' },
              { icon: Bot, title: 'Priority Access', description: 'Early access to new features and premium agents' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="p-6 rounded-2xl bg-card/50 border border-border hover:border-primary/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Roadmap */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-3xl bg-secondary/30 border border-primary/20"
          >
            <h3 className="text-xl font-bold text-foreground mb-8 text-center">Utility Rollout Roadmap</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {utilityPhases.map((phase, i) => (
                <div key={i} className="relative">
                  {i < utilityPhases.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-border -translate-x-1/2 z-0" />
                  )}
                  <div className="relative z-10 p-6 rounded-2xl bg-card border border-border">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        phase.status === 'upcoming' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      )}>
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">{phase.phase}</div>
                        <div className="font-bold text-foreground">{phase.title}</div>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {phase.items.map((item, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-border relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />
        </div>

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mx-auto mb-8 shadow-[0_0_60px_-10px] shadow-primary/50">
              <GhostIcon variant="logo" size={40} className="text-primary-foreground" />
            </div>

            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">
              Join the <span className="text-primary">Ghost Army</span>
            </h2>

            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Be part of the protocol powering the next generation of autonomous AI agents. 
              Fair launch. Real utility. Built on Solana.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-xl shadow-[0_0_40px_-10px] shadow-primary/50">
                <Rocket className="w-5 h-5 mr-2" />
                Launch on Pump.fun
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <a href="https://t.me/GhostSpeakAI" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-xl">
                  <Globe className="w-5 h-5 mr-2" />
                  Join Telegram
                </Button>
              </a>
            </div>

            <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <a href="https://x.com/ghostspeak_io" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-2">
                <ExternalLink className="w-4 h-4" /> Twitter/X
              </a>
              <a href="https://t.me/GhostSpeakAI" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-2">
                <ExternalLink className="w-4 h-4" /> Telegram
              </a>
              <a href="https://x.com/i/communities/2001702151752683683" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-2">
                <ExternalLink className="w-4 h-4" /> X Community
              </a>
              <a href="https://github.com/Ghostspeak/GhostSpeak" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-2">
                <ExternalLink className="w-4 h-4" /> GitHub
              </a>
              <Link href="/docs" className="hover:text-primary transition-colors flex items-center gap-2">
                <ExternalLink className="w-4 h-4" /> Documentation
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer Note */}
      <section className="py-12 border-t border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Disclaimer:</strong> $GHOST is a utility token for the GhostSpeak Protocol. 
            This is not financial advice. Do your own research before participating in any token launch. 
            Cryptocurrency investments carry risk.
          </p>
        </div>
      </section>
    </div>
  )
}
