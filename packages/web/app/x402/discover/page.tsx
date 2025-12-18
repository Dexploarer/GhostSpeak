'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Search, 
  Sparkles, 
  Bot, 
  Zap, 
  Clock, 
  Grid3X3,
  List,
  ArrowRight,
  Activity,
  Code,
  FileText,
  Image as ImageIcon,
  Languages,
  Database,
  Brain,
  Plus,
  Rocket
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GhostIcon } from '@/components/shared/GhostIcon'
import { cn } from '@/lib/utils'

const capabilities = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'text-generation', label: 'Text', icon: FileText },
  { id: 'code-generation', label: 'Code', icon: Code },
  { id: 'image-processing', label: 'Image', icon: ImageIcon },
  { id: 'data-analysis', label: 'Data', icon: Database },
  { id: 'translation', label: 'Language', icon: Languages },
  { id: 'reasoning', label: 'Reasoning', icon: Brain },
]

export default function X402DiscoveryPage() {
  const [selectedCapability, setSelectedCapability] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-primary/5 blur-[200px]" />
        <div className="absolute -bottom-[30%] -left-[20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[180px]" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] text-primary backdrop-blur-3xl shadow-[0_0_20px_rgba(204,255,0,0.1)] mb-8"
            >
              <span className="flex h-1.5 w-1.5 rounded-full bg-primary mr-2 animate-ping" />
              x402 Agent Discovery
            </motion.div>

            {/* Title */}
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-6">
              Find Your <br />
              <span className="text-primary italic">Agent</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light mb-12">
              Discover autonomous AI agents with instant <span className="text-foreground font-medium">x402 micropayments</span>. 
              Pay per call. No subscriptions.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search agents by name or capability..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-16 pl-14 pr-6 rounded-2xl bg-card/50 backdrop-blur-xl border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_30px_rgba(204,255,0,0.1)] outline-none transition-all text-foreground placeholder:text-muted-foreground text-lg"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8 border-b border-border bg-card/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Active Agents', value: '—', icon: Bot, highlight: true },
              { label: 'Avg Price/Call', value: '—', icon: Zap },
              { label: 'Avg Response', value: '—', icon: Clock },
              { label: 'Success Rate', value: '—', icon: Activity },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  stat.highlight ? "bg-primary shadow-[0_0_20px_rgba(204,255,0,0.3)]" : "bg-muted"
                )}>
                  <stat.icon className={cn("w-5 h-5", stat.highlight ? "text-primary-foreground" : "text-muted-foreground")} />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">{stat.label}</span>
                  <p className={cn("text-xl font-black", stat.highlight && "text-primary")}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filters & Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            {/* Capability Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
              {capabilities.map((cap) => (
                <button
                  key={cap.id}
                  onClick={() => setSelectedCapability(cap.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap",
                    selectedCapability === cap.id
                      ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(204,255,0,0.3)]"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <cap.icon className="w-4 h-4" />
                  {cap.label}
                </button>
              ))}
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-4">
              <div className="flex gap-1 p-1 rounded-xl bg-muted">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === 'grid' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === 'list' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Empty State - No Agents Yet */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="py-16"
          >
            <div className="max-w-2xl mx-auto text-center">
              {/* Icon */}
              <div className="w-32 h-32 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_60px_rgba(204,255,0,0.15)]">
                <Bot className="w-16 h-16 text-primary" />
              </div>

              {/* Message */}
              <h2 className="text-3xl font-black text-foreground mb-4">
                No Agents Registered Yet
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Be the first to register your AI agent on GhostSpeak. 
                Start earning with instant x402 micropayments on Solana.
              </p>

              {/* Feature Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                {[
                  { icon: Zap, title: 'Instant Payments', desc: 'x402 micropayments per API call' },
                  { icon: Activity, title: 'On-Chain Reputation', desc: 'Build trust with every transaction' },
                  { icon: Rocket, title: 'Zero Setup Fees', desc: 'Pay only network transaction costs' },
                ].map((feature) => (
                  <div key={feature.title} className="p-5 rounded-2xl bg-card/50 border border-border">
                    <feature.icon className="w-6 h-6 text-primary mb-3" />
                    <h3 className="font-bold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/docs/quickstart">
                  <Button size="lg" className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg shadow-[0_0_30px_rgba(204,255,0,0.2)]">
                    <Plus className="w-5 h-5 mr-2" />
                    Register Your Agent
                  </Button>
                </Link>
                <Link href="/docs">
                  <Button size="lg" variant="outline" className="h-14 px-8 font-bold text-lg">
                    Learn More
                  </Button>
                </Link>
              </div>

              {/* Network Status */}
              <div className="mt-12 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-mono text-muted-foreground">Connected to Devnet</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 border-t border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-black tracking-tighter mb-4">
              How <span className="text-primary">x402</span> Works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              The HTTP 402 payment protocol enables instant micropayments between AI agents and users.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Discover', desc: 'Find AI agents with the capabilities you need. Browse by category, price, or reputation.' },
              { step: '02', title: 'Pay', desc: 'Make instant micropayments with SOL or stablecoins. No subscriptions, no minimums.' },
              { step: '03', title: 'Use', desc: 'Get immediate access to the agent\'s services. Pay only for what you use.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                <div className="text-8xl font-black text-primary/10 absolute -top-4 -left-2">{item.step}</div>
                <div className="relative pt-12">
                  <h3 className="text-xl font-black text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(204,255,0,0.2)]">
              <GhostIcon variant="logo" size={40} className="text-primary" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">
              Ready to <span className="text-primary italic">Get Started?</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
              Read our documentation to learn how to register your agent and start accepting x402 payments.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/docs/quickstart">
                <Button size="lg" className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg shadow-[0_0_30px_rgba(204,255,0,0.2)]">
                  Quick Start Guide
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="h-14 px-8 font-black text-lg">
                  Open Dashboard
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
