'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  Users,
  Sparkles,
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
    percentage: 90,
    color: '#ccff00', // Lime
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
    id: 'contributors',
    label: 'Early Contributors & Team',
    percentage: 5,
    color: '#06b6d4', // Cyan
    icon: Sparkles,
    description: 'Early contributors and core team building the future.',
    details: [
      'Core development team',
      'Early advisors',
      'Strategic partners',
      'Community moderators',
    ],
  },
  {
    id: 'liquidity',
    label: 'Liquidity & Development',
    percentage: 3,
    color: '#a855f7', // Purple
    icon: TrendingUp,
    description: 'Ensuring market liquidity and ongoing development.',
    details: [
      'DEX liquidity provision',
      'CEX listing reserves',
      'Development funding',
      'Infrastructure costs',
    ],
  },
  {
    id: 'vested',
    label: 'Vested',
    percentage: 2,
    color: '#71717a', // Zinc-500
    icon: Clock,
    description: 'Long-term aligned tokens with transparent vesting.',
    details: [
      '6-month cliff period',
      'Bi-weekly or monthly vest',
      '24-month total vesting',
      'Aligned with long-term success',
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
  // Dynamic sizing for mobile
  const [chartSize, setChartSize] = useState(320)
  
  useEffect(() => {
    const updateSize = () => {
      // Use smaller size on mobile screens
      const isMobile = window.innerWidth < 640
      setChartSize(isMobile ? 260 : 320)
    }
    
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const size = chartSize
  const strokeWidth = chartSize < 300 ? 36 : 48
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  let cumulativePercentage = 0

  // Handle tap for mobile
  const handleSegmentInteraction = (id: string) => {
    if (activeSegment === id) {
      setActiveSegment(null)
    } else {
      setActiveSegment(id)
    }
  }

  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute inset-0 blur-3xl opacity-20">
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
                  opacity: activeSegment && !isActive ? 0.3 : 1,
                }}
                onMouseEnter={() => setActiveSegment(alloc.id)}
                onMouseLeave={() => setActiveSegment(null)}
                onClick={() => handleSegmentInteraction(alloc.id)}
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
          <GhostIcon variant="logo" size={chartSize < 300 ? 36 : 48} className="mx-auto mb-2 text-lime-500" />
          <div className="text-2xl sm:text-3xl font-black text-white">$GHOST</div>
          <div className="text-[10px] sm:text-xs font-mono text-zinc-500 mt-1">100% DISTRIBUTED</div>
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

  // Handle tap for mobile
  const handleTap = () => {
    if (isActive) {
      onHover(null)
    } else {
      onHover(alloc.id)
    }
  }

  return (
    <motion.div
      className={`relative p-4 sm:p-6 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${
        isActive
          ? 'bg-zinc-900 border-lime-500/50 shadow-lg shadow-lime-500/10'
          : 'bg-zinc-900/50 border-white/10 hover:border-lime-500/30'
      }`}
      onMouseEnter={() => onHover(alloc.id)}
      onMouseLeave={() => onHover(null)}
      onClick={handleTap}
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
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${alloc.color}20` }}
          >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: alloc.color }} />
          </div>
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black" style={{ color: alloc.color }}>
              {alloc.percentage}%
            </div>
          </div>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-white mb-1 sm:mb-2">{alloc.label}</h3>
        <p className="text-xs sm:text-sm text-zinc-400 mb-3 sm:mb-4">{alloc.description}</p>

        <div className="space-y-1.5 sm:space-y-2">
          {alloc.details.map((detail, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] sm:text-xs text-zinc-500">
              <ChevronRight className="w-3 h-3 shrink-0" style={{ color: alloc.color }} />
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
    <div className="min-h-screen bg-black text-white selection:bg-lime-500/30">
      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 md:py-32 overflow-hidden border-b border-white/10">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.05]" />
        <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-lime-500/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-48 sm:w-64 h-48 sm:h-64 bg-cyan-500/5 rounded-full blur-[100px]" />

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <motion.div
            className="text-center mb-10 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-lime-500/10 border border-lime-500/20 mb-4 sm:mb-6">
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-lime-500" />
              <span className="text-xs sm:text-sm font-mono text-lime-500">TOKENOMICS</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-7xl font-black tracking-tighter mb-4 sm:mb-6">
              Fair Launch. <span className="text-lime-500">Community First.</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-light px-2">
              90% to the community. Transparent vesting. Built for
              long-term value, not quick exits.
            </p>

            {/* Token Contract Address */}
            <div className="mt-6 sm:mt-8 space-y-3">
              <div className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
                <span className="text-xs text-zinc-500 font-mono uppercase tracking-wider">CA:</span>
                <code className="text-xs sm:text-sm font-mono text-lime-500 break-all select-all">
                  DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump
                </code>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
                  Mainnet
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 max-w-lg mx-auto">
                $GHOST launched on Solana mainnet to fund the GhostSpeak protocol&apos;s mainnet deployment.
                Token governance activates when the protocol goes live on mainnet.
              </p>
            </div>
          </motion.div>

          {/* Interactive Chart Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
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
              className="space-y-3 sm:space-y-4"
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
                    className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                      isActive ? 'bg-zinc-900 border border-lime-500/30' : 'hover:bg-zinc-900/50'
                    }`}
                    onMouseEnter={() => setActiveSegment(alloc.id)}
                    onMouseLeave={() => setActiveSegment(null)}
                    onClick={() => setActiveSegment(isActive ? null : alloc.id)}
                    whileHover={{ x: 8 }}
                  >
                    <div
                      className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shrink-0"
                      style={{ backgroundColor: alloc.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-500 shrink-0" />
                        <span className="font-semibold text-white text-sm sm:text-base truncate">{alloc.label}</span>
                      </div>
                    </div>
                    <div
                      className="text-lg sm:text-xl font-black font-mono shrink-0"
                      style={{ color: isActive ? alloc.color : 'white' }}
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
      <section className="py-16 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            className="text-center mb-10 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight mb-3 sm:mb-4">
              Allocation <span className="text-lime-500">Breakdown</span>
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto px-2">
              Every token has a purpose. Every allocation serves the ecosystem.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
      <section className="py-16 sm:py-24 border-t border-white/10 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            className="text-center mb-10 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4 sm:mb-6">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-500" />
              <span className="text-xs sm:text-sm font-mono text-cyan-500">VESTING SCHEDULE</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight mb-3 sm:mb-4 text-white">
              Team <span className="text-cyan-500">Vesting</span>
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto px-2">
              Aligned incentives through time-locked vesting. Team tokens release gradually.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {/* Vesting Card 1 */}
            <motion.div
              className="p-6 sm:p-8 rounded-2xl bg-zinc-900/50 border border-white/10 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="text-4xl sm:text-5xl font-black text-cyan-500 mb-2">6</div>
              <div className="text-xs sm:text-sm font-mono text-zinc-500 uppercase tracking-wider">
                Month Cliff
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-400 mt-3 sm:mt-4">
                No team tokens released for first 6 months
              </p>
            </motion.div>

            {/* Vesting Card 2 */}
            <motion.div
              className="p-6 sm:p-8 rounded-2xl bg-zinc-900/50 border border-white/10 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-3xl sm:text-5xl font-black text-cyan-500 mb-2">Bi-Weekly</div>
              <div className="text-xs sm:text-sm font-mono text-zinc-500 uppercase tracking-wider">
                Release Schedule
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-400 mt-3 sm:mt-4">
                Tokens vest every 2 weeks or monthly
              </p>
            </motion.div>

            {/* Vesting Card 3 */}
            <motion.div
              className="p-6 sm:p-8 rounded-2xl bg-zinc-900/50 border border-white/10 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-4xl sm:text-5xl font-black text-cyan-500 mb-2">24</div>
              <div className="text-xs sm:text-sm font-mono text-zinc-500 uppercase tracking-wider">
                Month Total Vest
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-400 mt-3 sm:mt-4">
                Full vesting period for team allocation
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Milestone Buybacks Section */}
      <section className="py-16 sm:py-24 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            className="text-center mb-10 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-lime-500/10 border border-lime-500/20 mb-4 sm:mb-6">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-lime-500" />
              <span className="text-xs sm:text-sm font-mono text-lime-500">CREATOR FEES</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight mb-3 sm:mb-4 text-white">
              Milestone <span className="text-lime-500">Buybacks</span>
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto px-2">
              Creator fees fund development and strategic buybacks at key market cap milestones.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 max-w-4xl mx-auto">
            {milestones.map((milestone, index) => {
              const Icon = milestone.icon

              return (
                <motion.div
                  key={milestone.cap}
                  className="relative p-6 sm:p-8 rounded-2xl bg-zinc-900/50 border border-white/10 overflow-hidden group hover:border-lime-500/50 transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* Background glow */}
                  <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-lime-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-lime-500/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-lime-500" />
                      </div>
                      <div>
                        <div className="text-[10px] sm:text-xs font-mono text-lime-500 uppercase tracking-wider">
                          {milestone.label}
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-white">${milestone.cap}</div>
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm text-zinc-400">{milestone.action}</div>

                    <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10">
                      <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono text-zinc-500">
                        <div className="w-2 h-2 rounded-full bg-lime-500 animate-pulse" />
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
            className="mt-8 sm:mt-12 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-xs sm:text-sm text-zinc-500 max-w-2xl mx-auto px-2">
              Buybacks reduce circulating supply and are executed transparently on-chain. All
              transactions are verifiable on Solana Explorer.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 border-t border-white/10 bg-zinc-900/20 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[150px] sm:h-[300px] bg-lime-500/10 rounded-full blur-[150px]" />

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <GhostIcon variant="logo" size={48} className="mx-auto mb-4 sm:mb-6 text-lime-500 sm:hidden" />
            <GhostIcon variant="logo" size={64} className="mx-auto mb-6 text-lime-500 hidden sm:block" />

            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight mb-4 sm:mb-6 text-white">
              Join the <span className="text-lime-500">Ghost Economy</span>
            </h2>

            <p className="text-base sm:text-lg text-zinc-400 mb-6 sm:mb-8 max-w-xl mx-auto px-2">
              Be part of the most community-focused AI agent protocol on Solana. 90% community
              allocation. Fair launch. No VCs.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-lime-500 text-black font-bold rounded-xl hover:opacity-90 transition-opacity text-sm sm:text-base"
              >
                Explore Protocol
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-zinc-900 border border-white/10 text-white font-bold rounded-xl hover:border-lime-500/50 transition-colors text-sm sm:text-base"
              >
                Launch Dashboard
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer note */}
      <div className="py-6 sm:py-8 border-t border-white/10 text-center">
        <p className="text-[10px] sm:text-xs font-mono text-zinc-600 px-4">
          Token distribution subject to governance decisions. Not financial advice.
        </p>
      </div>
    </div>
  )
}
