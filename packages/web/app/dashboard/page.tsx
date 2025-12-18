'use client'

import React from 'react'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { GhostIcon } from '@/components/shared/GhostIcon'
import { 
  Sparkles, 
  BookOpen, 
  ArrowRight,
  Zap,
  Activity,
  Clock,
  Globe,
  Bot,
  Shield,
  Vote,
  BarChart3,
  ExternalLink,
  Wallet,
  Copy,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'

const comingSoonFeatures = [
  { 
    title: 'AI Agents', 
    description: 'Deploy autonomous agents on-chain', 
    icon: Bot, 
    color: 'from-lime-500/20 to-lime-500/5',
    iconColor: 'text-lime-500'
  },
  { 
    title: 'Escrow', 
    description: 'Secure milestone-based payments', 
    icon: Shield, 
    color: 'from-cyan-500/20 to-cyan-500/5',
    iconColor: 'text-cyan-500'
  },
  { 
    title: 'Governance', 
    description: 'Community-driven protocol updates', 
    icon: Vote, 
    color: 'from-purple-500/20 to-purple-500/5',
    iconColor: 'text-purple-500'
  },
  { 
    title: 'Analytics', 
    description: 'Real-time performance metrics', 
    icon: BarChart3, 
    color: 'from-orange-500/20 to-orange-500/5',
    iconColor: 'text-orange-500'
  },
]

export default function DashboardOverview() {
  const { publicKey, connected } = useWallet()
  const [copied, setCopied] = React.useState(false)

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl font-black tracking-tight text-foreground"
          >
            Command Center
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground mt-2"
          >
            {connected 
              ? 'Your protocol dashboard is ready.' 
              : 'Connect your wallet to access the full dashboard.'
            }
          </motion.p>
        </div>

        {/* Network Badge */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-black text-primary">DEVNET</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Solana</span>
          </div>
        </motion.div>
      </div>

      {/* Wallet Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border bg-card/50 backdrop-blur-xl p-6 lg:p-8"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center",
              connected 
                ? "bg-primary shadow-[0_0_30px_rgba(204,255,0,0.3)]" 
                : "bg-muted"
            )}>
              <Wallet className={cn("w-7 h-7", connected ? "text-primary-foreground" : "text-muted-foreground")} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {connected ? 'Wallet Connected' : 'Connect Wallet'}
              </h2>
              {connected && publicKey ? (
                <button 
                  onClick={copyAddress}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
                >
                  <span className="font-mono">
                    {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
                  </span>
                  {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  Use the button in the navigation to connect
                </p>
              )}
            </div>
          </div>

          {/* Network Stats */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Activity className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">TPS</span>
                <p className="text-lg font-bold text-foreground">2,847</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Latency</span>
                <p className="text-lg font-bold text-foreground">~400ms</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Status</span>
                <p className="text-lg font-bold text-primary">Online</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link href="/x402/discover" className="block group">
            <div className="rounded-2xl border border-primary/20 bg-linear-to-br from-primary/10 to-transparent p-6 hover:border-primary/40 hover:shadow-[0_0_40px_rgba(204,255,0,0.1)] transition-all">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(204,255,0,0.3)]">
                  <Sparkles className="w-6 h-6 text-primary-foreground" />
                </div>
                <ExternalLink className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-xl font-bold text-foreground mt-4">Discover Agents</h3>
              <p className="text-muted-foreground mt-2">Browse x402-enabled AI agents and explore the marketplace.</p>
              <div className="flex items-center gap-2 mt-4 text-primary font-bold text-sm">
                <span>Explore Now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Link href="/docs" className="block group">
            <div className="rounded-2xl border border-border bg-card/50 p-6 hover:border-primary/20 hover:bg-card/80 transition-all">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-foreground" />
                </div>
                <ExternalLink className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-xl font-bold text-foreground mt-4">Documentation</h3>
              <p className="text-muted-foreground mt-2">Learn about the x402 protocol, SDK integration, and more.</p>
              <div className="flex items-center gap-2 mt-4 text-foreground font-bold text-sm group-hover:text-primary transition-colors">
                <span>Read Docs</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* MVP Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-border bg-card/50 backdrop-blur-xl p-8 text-center"
      >
        <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
          <GhostIcon variant="logo" size={40} className="text-primary" />
        </div>
        <h2 className="text-2xl font-black text-foreground mb-3">GhostSpeak MVP</h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-6">
          Welcome to the GhostSpeak protocol dashboard. We're currently on{' '}
          <span className="text-primary font-bold">Devnet</span> with core features 
          available for testing. Additional features are coming soon.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/x402/discover">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-[0_0_20px_rgba(204,255,0,0.2)]">
              <Sparkles className="w-4 h-4 mr-2" />
              Explore Agents
            </Button>
          </Link>
          <Link href="/docs/quickstart">
            <Button variant="outline" className="font-bold">
              <BookOpen className="w-4 h-4 mr-2" />
              Quick Start
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Coming Soon Grid */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-4">Coming Soon</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {comingSoonFeatures.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.05 }}
              className="rounded-2xl border border-border bg-card/30 p-5 opacity-60 hover:opacity-80 transition-opacity"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br",
                feature.color
              )}>
                <feature.icon className={cn("w-5 h-5", feature.iconColor)} />
              </div>
              <h4 className="text-sm font-bold text-foreground mt-3">{feature.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
