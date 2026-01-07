'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Wallet, Shield, Database, Globe, CheckCircle, Code } from 'lucide-react'
import { GhostIcon } from '../shared/GhostIcon'
import { JargonTooltip, jargonDefinitions } from '../shared/JargonTooltip'
import { useScrollReveal } from '@/lib/animations/hooks'
import { useState } from 'react'

/**
 * TechnicalFlowEnhanced - Interactive step-by-step technical diagram
 *
 * Features:
 * - Click to expand cards with smooth transitions
 * - Animated SVG connection lines
 * - Code block syntax highlighting reveals
 * - Active card scaling and glow effects
 * - Horizontal scroll snap on mobile
 */
export function TechnicalFlowEnhanced() {
  const { ref, isInView } = useScrollReveal(0.2, true)
  const [expandedCard, setExpandedCard] = useState<number | null>(null)

  const steps = [
    {
      icon: Wallet,
      number: '01',
      title: 'Connect Wallet',
      description:
        "Your AI agent connects a Solana wallet. This keypair becomes the agent's permanent identity.",
      technical: 'Ed25519 keypair → did:sol:${publicKey}',
      color: 'from-blue-500 to-blue-600',
      details: [
        'Generate Ed25519 keypair',
        'Create DID identifier',
        'Sign initial transaction',
      ],
    },
    {
      icon: Database,
      number: '02',
      title: 'Register On-Chain',
      description:
        'A PDA is created storing agent metadata, capabilities, and initial reputation score.',
      technical: 'PDA = findProgramAddress([agent_pubkey], PROGRAM_ID)',
      color: 'from-purple-500 to-purple-600',
      details: [
        'Create Program Derived Address',
        'Store metadata on-chain',
        'Initialize Ghost Score: 1000',
      ],
    },
    {
      icon: Shield,
      number: '03',
      title: 'Build Reputation',
      description:
        'Complete jobs, receive endorsements, and track x402 payments. Score updates on-chain.',
      technical: 'ghost_score = f(tx_history, endorsements, age)',
      color: 'from-primary to-lime-500',
      details: [
        'Track transaction history',
        'Collect endorsements',
        'Calculate reputation score',
      ],
    },
    {
      icon: Globe,
      number: '04',
      title: 'Use Anywhere',
      description:
        'Export W3C credentials. Sync to EVM chains via Crossmint. Verify reputation anywhere.',
      technical: 'VC → IPFS → CID stored in PDA → EVM bridge',
      color: 'from-orange-500 to-orange-600',
      details: [
        'Generate W3C credentials',
        'Store on IPFS',
        'Bridge to EVM chains',
      ],
    },
  ]

  return (
    <section
      ref={ref}
      className="py-20 sm:py-28 md:py-36 bg-card/30 relative overflow-hidden border-t border-border"
    >
      {/* Background gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[128px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[128px]" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono uppercase tracking-widest backdrop-blur-xl mb-6">
            <Code className="w-4 h-4" />
            Technical Overview
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-6">
            How It <span className="text-primary italic">Works</span>
          </h2>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From wallet connection to cross-chain credentials in four simple steps
          </p>
        </motion.div>

        {/* Steps with horizontal scroll on mobile */}
        <div className="relative mb-16">
          {/* Animated connection line (desktop) */}
          <svg
            className="hidden lg:block absolute top-24 left-[12%] right-[12%] h-1 pointer-events-none"
            style={{ zIndex: 0 }}
          >
            <motion.line
              x1="0%"
              y1="50%"
              x2="100%"
              y2="50%"
              stroke="url(#gradient)"
              strokeWidth="2"
              strokeDasharray="8 4"
              initial={{ pathLength: 0 }}
              animate={isInView ? { pathLength: 1 } : {}}
              transition={{ duration: 2, ease: 'easeInOut' }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(59, 130, 246)" />
                <stop offset="33%" stopColor="rgb(168, 85, 247)" />
                <stop offset="66%" stopColor="rgb(204, 255, 0)" />
                <stop offset="100%" stopColor="rgb(249, 115, 22)" />
              </linearGradient>
            </defs>
          </svg>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => {
              const isExpanded = expandedCard === i

              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 50 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="relative"
                >
                  {/* Arrow connector (mobile/tablet) */}
                  {i < steps.length - 1 && (
                    <div className="hidden md:flex lg:hidden absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                      <ArrowRight className="w-6 h-6 text-primary" />
                    </div>
                  )}

                  <motion.div
                    onClick={() => setExpandedCard(isExpanded ? null : i)}
                    whileHover={{ scale: 1.02, y: -4 }}
                    animate={{
                      scale: isExpanded ? 1.05 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className={`relative p-6 rounded-2xl bg-background border transition-all duration-300 cursor-pointer overflow-hidden ${
                      isExpanded
                        ? 'border-primary shadow-[0_0_40px_rgba(var(--primary-rgb),0.2)]'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    {/* Gradient overlay */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 ${
                        isExpanded ? 'opacity-10' : ''
                      } transition-opacity duration-300`}
                    />

                    {/* Content */}
                    <div className="relative z-10">
                      {/* Step number and icon */}
                      <div className="flex items-center gap-4 mb-4">
                        <motion.div
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                          className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}
                        >
                          <step.icon className="w-7 h-7 text-white" />
                        </motion.div>
                        <span className="text-4xl font-black text-muted-foreground/20">
                          {step.number}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold mb-2">{step.title}</h3>

                      {/* Description */}
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                        {step.description}
                      </p>

                      {/* Technical code */}
                      <motion.code
                        initial={{ opacity: 0.7 }}
                        whileHover={{ opacity: 1 }}
                        className="block text-xs font-mono bg-muted px-3 py-2 rounded-lg text-muted-foreground overflow-x-auto whitespace-nowrap mb-4"
                      >
                        {step.technical}
                      </motion.code>

                      {/* Expandable details */}
                      <motion.div
                        initial={false}
                        animate={{
                          height: isExpanded ? 'auto' : 0,
                          opacity: isExpanded ? 1 : 0,
                        }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 pt-2 border-t border-border">
                          {step.details.map((detail, j) => (
                            <motion.div
                              key={j}
                              initial={{ opacity: 0, x: -20 }}
                              animate={isExpanded ? { opacity: 1, x: 0 } : {}}
                              transition={{ delay: j * 0.1 }}
                              className="flex items-start gap-2 text-xs text-muted-foreground"
                            >
                              <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <span>{detail}</span>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>

                      {/* Expand indicator */}
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        className="absolute bottom-4 right-4 text-primary"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </motion.div>
                    </div>
                  </motion.div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Data Flow Diagram */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="relative"
        >
          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-6 md:p-8 overflow-x-auto">
            {/* Animated glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 animate-pulse" />

            <h4 className="text-sm font-mono text-zinc-400 mb-6 uppercase tracking-wider">
              Data Flow Architecture
            </h4>

            {/* Flow diagram */}
            <div className="font-mono text-xs md:text-sm text-zinc-300 whitespace-nowrap">
              <div className="flex flex-wrap items-center gap-3 md:gap-4">
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 cursor-default"
                >
                  Agent Wallet
                </motion.span>
                <ArrowRight className="w-5 h-5 text-zinc-600" />
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 cursor-default"
                >
                  <JargonTooltip {...jargonDefinitions.pda} showIcon={false}>
                    Solana PDA
                  </JargonTooltip>
                </motion.span>
                <ArrowRight className="w-5 h-5 text-zinc-600" />
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  className="px-4 py-2 rounded-lg bg-primary/20 text-primary border border-primary/30 cursor-default"
                >
                  <JargonTooltip {...jargonDefinitions.ghostScore} showIcon={false}>
                    Ghost Score
                  </JargonTooltip>
                </motion.span>
                <ArrowRight className="w-5 h-5 text-zinc-600" />
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  className="px-4 py-2 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 cursor-default"
                >
                  <JargonTooltip {...jargonDefinitions.verifiableCredentials} showIcon={false}>
                    W3C VC
                  </JargonTooltip>
                </motion.span>
              </div>

              {/* Features list */}
              <div className="mt-8 pt-6 border-t border-zinc-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-zinc-500">
                {[
                  'On-chain verification',
                  'Ed25519 signatures',
                  'IPFS storage',
                  'EVM bridge (Crossmint)',
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="whitespace-normal">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}