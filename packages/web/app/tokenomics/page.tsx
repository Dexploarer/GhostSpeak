'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  Users,
  Droplets,
  Heart,
  Sparkles,
  Code,
  TrendingUp,
  Clock,
  Target,
  ChevronRight,
  Coins,
} from 'lucide-react'
import { GhostIcon } from '@/components/shared/GhostIcon'

interface TokenAllocation {
  id: string
  label: string
  percentage: number
  color: string
  icon: LucideIcon
  description: string
  details: string[]
}

const allocations: TokenAllocation[] = [
  {
    id: 'community',
    label: 'Community',
    percentage: 80,
    color: '#ccff00',
    icon: Users,
    description: 'The backbone of GhostSpeak — our community drives everything.',
    details: [
      'Fair launch distribution',
      'Governance participation rewards',
      'Ecosystem growth incentives',
      'Agent staking rewards',
    ],
  },
  {
    id: 'creator-fees',
    label: 'Creator Fees',
    percentage: 10,
    color: '#22c55e',
    icon: Code,
    description: 'Development funding and strategic buybacks at milestones.',
    details: [
      'Development & infrastructure',
      'Buybacks at 500K market cap',
      'Buybacks at 1M market cap',
      'Continuous protocol improvements',
    ],
  },
  {
    id: 'early-contributors',
    label: 'Early Contributors',
    percentage: 4,
    color: '#a855f7',
    icon: Heart,
    description: 'Rewarding those who believed in the vision from day one.',
    details: [
      'Alpha testers & bug reporters',
      'Community moderators',
      'Content creators & advocates',
      'Strategic advisors',
    ],
  },
  {
    id: 'team',
    label: 'Team',
    percentage: 3,
    color: '#3b82f6',
    icon: Sparkles,
    description: 'Core team allocation with transparent vesting schedule.',
    details: [
      'Vests bi-weekly or monthly',
      'Locked for 6 months cliff',
      '24-month total vesting period',
      'Aligned with long-term success',
    ],
  },
  {
    id: 'liquidity',
    label: 'Liquidity & Marketing',
    percentage: 3,
    color: '#f59e0b',
    icon: Droplets,
    description: 'Ensuring deep liquidity and strategic market presence.',
    details: [
      'DEX liquidity provision',
      'CEX listing reserves',
      'Marketing campaigns',
      'Partnership development',
    ],
  },
]

const milestones = [
  {
    cap: '500K',
    label: 'First Milestone',
    action: 'Development funding + Strategic buyback',
    icon: Target,
  },
  {
    cap: '1M',
    label: 'Second Milestone',
    action: 'Expanded development + Larger buyback',
    icon: TrendingUp,
  },
]

// Donut chart component
function TokenomicsDonut({
  activeSegment,
  setActiveSegment,
}: {
  activeSegment: string | null
  setActiveSegment: (id: string | null) => void
}) {
  const size = 320
  const strokeWidth = 48
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  let cumulativePercentage = 0

  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute inset-0 blur-3xl opacity-30">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {allocations.map((alloc) => {
            const segmentLength = (alloc.percentage / 100) * circumference
            const offset = circumference - (cumulativePercentage / 100) * circumference
            cumulativePercentage += alloc.percentage

            return (
              <circle
                key={`glow-${alloc.id}`}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={alloc.color}
                strokeWidth={strokeWidth + 20}
                strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${center} ${center})`}
              />
            )
          })}
        </svg>
      </div>

      {/* Main chart */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="relative z-10 drop-shadow-2xl"
      >
        {(() => {
          let cumulative = 0
          return allocations.map((alloc) => {
            const segmentLength = (alloc.percentage / 100) * circumference
            const offset = circumference - (cumulative / 100) * circumference
            cumulative += alloc.percentage

            const isActive = activeSegment === alloc.id

            return (
              <motion.circle
                key={alloc.id}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={alloc.color}
                strokeWidth={isActive ? strokeWidth + 8 : strokeWidth}
                strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${center} ${center})`}
                className="cursor-pointer transition-all duration-300"
                style={{
                  filter: isActive ? `drop-shadow(0 0 20px ${alloc.color})` : 'none',
                  opacity: activeSegment && !isActive ? 0.4 : 1,
                }}
                onMouseEnter={() => setActiveSegment(alloc.id)}
                onMouseLeave={() => setActiveSegment(null)}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
              />
            )
          })
        })()}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <GhostIcon variant="logo" size={48} className="mx-auto mb-2 text-primary" />
          <div className="text-3xl font-black text-foreground">$GHOST</div>
          <div className="text-xs font-mono text-muted-foreground mt-1">100% DISTRIBUTED</div>
        </motion.div>
      </div>
    </div>
  )
}

// Allocation card component
function AllocationCard({
  alloc,
  isActive,
  onHover,
}: {
  alloc: TokenAllocation
  isActive: boolean
  onHover: (id: string | null) => void
}) {
  const Icon = alloc.icon

  return (
    <motion.div
      className={`relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${
        isActive
          ? 'bg-card border-primary/50 shadow-lg shadow-primary/10'
          : 'bg-card/50 border-border hover:border-primary/30'
      }`}
      onMouseEnter={() => onHover(alloc.id)}
      onMouseLeave={() => onHover(null)}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      {/* Background glow on active */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute inset-0 opacity-10"
            style={{ background: `radial-gradient(circle at center, ${alloc.color}, transparent)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${alloc.color}20` }}
          >
            <Icon className="w-6 h-6" style={{ color: alloc.color }} />
          </div>
          <div className="text-right">
            <div className="text-3xl font-black" style={{ color: alloc.color }}>
              {alloc.percentage}%
            </div>
          </div>
        </div>

        <h3 className="text-lg font-bold text-foreground mb-2">{alloc.label}</h3>
        <p className="text-sm text-muted-foreground mb-4">{alloc.description}</p>

        <div className="space-y-2">
          {alloc.details.map((detail, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <ChevronRight className="w-3 h-3" style={{ color: alloc.color }} />
              <span>{detail}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default function TokenomicsPage() {
  const [activeSegment, setActiveSegment] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden border-b border-border">
        {/* Background effects */}
        <div className="absolute inset-0 aurora-bg opacity-50" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Coins className="w-4 h-4 text-primary" />
              <span className="text-sm font-mono text-primary">TOKENOMICS</span>
            </div>

            <h1 className="text-4xl md:text-7xl font-black tracking-tighter mb-6">
              Fair Launch. <span className="text-primary">Community First.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light">
              80% to the community. Transparent vesting. Milestone-based buybacks. Built for
              long-term value, not quick exits.
            </p>
          </motion.div>

          {/* Interactive Chart Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Donut Chart */}
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <TokenomicsDonut activeSegment={activeSegment} setActiveSegment={setActiveSegment} />
            </motion.div>

            {/* Legend */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {allocations.map((alloc) => {
                const Icon = alloc.icon
                const isActive = activeSegment === alloc.id

                return (
                  <motion.div
                    key={alloc.id}
                    className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                      isActive ? 'bg-card border border-primary/30' : 'hover:bg-card/50'
                    }`}
                    onMouseEnter={() => setActiveSegment(alloc.id)}
                    onMouseLeave={() => setActiveSegment(null)}
                    whileHover={{ x: 8 }}
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: alloc.color }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{alloc.label}</span>
                      </div>
                    </div>
                    <div
                      className="text-xl font-black font-mono"
                      style={{ color: isActive ? alloc.color : 'var(--foreground)' }}
                    >
                      {alloc.percentage}%
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Detailed Breakdown Section */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Allocation <span className="text-primary">Breakdown</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every token has a purpose. Every allocation serves the ecosystem.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allocations.map((alloc) => (
              <AllocationCard
                key={alloc.id}
                alloc={alloc}
                isActive={activeSegment === alloc.id}
                onHover={setActiveSegment}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Vesting Schedule Section */}
      <section className="py-24 border-t border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-mono text-blue-500">VESTING SCHEDULE</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Team <span className="text-primary">Vesting</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Aligned incentives through time-locked vesting. Team tokens release gradually.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Vesting Card 1 */}
            <motion.div
              className="p-8 rounded-2xl bg-card border border-border text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="text-5xl font-black text-primary mb-2">6</div>
              <div className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
                Month Cliff
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                No team tokens released for first 6 months
              </p>
            </motion.div>

            {/* Vesting Card 2 */}
            <motion.div
              className="p-8 rounded-2xl bg-card border border-border text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-5xl font-black text-primary mb-2">Bi-Weekly</div>
              <div className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
                Release Schedule
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Tokens vest every 2 weeks or monthly
              </p>
            </motion.div>

            {/* Vesting Card 3 */}
            <motion.div
              className="p-8 rounded-2xl bg-card border border-border text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-5xl font-black text-primary mb-2">24</div>
              <div className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
                Month Total Vest
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Full vesting period for team allocation
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Milestone Buybacks Section */}
      <section className="py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm font-mono text-green-500">CREATOR FEES</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Milestone <span className="text-primary">Buybacks</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Creator fees fund development and strategic buybacks at key market cap milestones.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {milestones.map((milestone, index) => {
              const Icon = milestone.icon

              return (
                <motion.div
                  key={milestone.cap}
                  className="relative p-8 rounded-2xl bg-card border border-border overflow-hidden group hover:border-green-500/50 transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* Background glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
                        <Icon className="w-7 h-7 text-green-500" />
                      </div>
                      <div>
                        <div className="text-xs font-mono text-green-500 uppercase tracking-wider">
                          {milestone.label}
                        </div>
                        <div className="text-3xl font-black text-foreground">${milestone.cap}</div>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">{milestone.action}</div>

                    <div className="mt-6 pt-6 border-t border-border">
                      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span>Market Cap Target</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Additional info */}
          <motion.div
            className="mt-12 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Buybacks reduce circulating supply and are executed transparently on-chain. All
              transactions are verifiable on Solana Explorer.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-border bg-card/50 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 aurora-bg opacity-30" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[150px]" />

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <GhostIcon variant="logo" size={64} className="mx-auto mb-6 text-primary" />

            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">
              Join the <span className="text-primary">Ghost Economy</span>
            </h2>

            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Be part of the most community-focused AI agent protocol on Solana. 80% community
              allocation. Fair launch. No VCs.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                Explore Protocol
                <ChevronRight className="w-5 h-5" />
              </a>
              <a
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-card border border-border text-foreground font-bold rounded-xl hover:border-primary/50 transition-colors"
              >
                Launch Dashboard
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer note */}
      <div className="py-8 border-t border-border text-center">
        <p className="text-xs font-mono text-muted-foreground/60">
          Token distribution subject to governance decisions. Not financial advice.
        </p>
      </div>
    </div>
  )
}
