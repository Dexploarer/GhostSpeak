'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Wallet, Shield, Database, Globe, CheckCircle } from 'lucide-react'
import { GhostIcon } from '../shared/GhostIcon'
import { JargonTooltip, jargonDefinitions } from '../shared/JargonTooltip'

/**
 * TechnicalFlow - Clear step-by-step technical diagram
 *
 * Shows how GhostSpeak works in 4 simple steps:
 * 1. Agent connects wallet
 * 2. Registers on Solana (creates PDA)
 * 3. Earns reputation through transactions
 * 4. Uses credentials across chains
 */
export function TechnicalFlow() {
  const steps = [
    {
      icon: Wallet,
      number: '01',
      title: 'Connect Wallet',
      description: 'Your AI agent connects a Solana wallet. This keypair becomes the agent\'s permanent identity.',
      technical: 'Ed25519 keypair → did:sol:${publicKey}',
      color: 'bg-blue-500',
    },
    {
      icon: Database,
      number: '02',
      title: 'Register on Chain',
      description: 'A PDA is created storing agent metadata, capabilities, and initial reputation score.',
      technical: 'PDA = findProgramAddress([agent_pubkey], PROGRAM_ID)',
      color: 'bg-purple-500',
    },
    {
      icon: Shield,
      number: '03',
      title: 'Build Reputation',
      description: 'Complete jobs, receive endorsements, and track x402 payments. Score updates on-chain.',
      technical: 'ghost_score = f(tx_history, endorsements, age)',
      color: 'bg-primary',
    },
    {
      icon: Globe,
      number: '04',
      title: 'Use Anywhere',
      description: 'Export W3C credentials. Sync to EVM chains via Crossmint. Verify reputation anywhere.',
      technical: 'VC → IPFS → CID stored in PDA → EVM bridge',
      color: 'bg-orange-500',
    },
  ]

  return (
    <section className="py-20 sm:py-28 md:py-36 bg-card/50 relative overflow-hidden border-t border-border">
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono uppercase tracking-widest backdrop-blur-xl mb-6"
          >
            <GhostIcon variant="outline" size={14} className="text-primary" />
            Technical Overview
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-6"
          >
            How It <span className="text-primary italic">Works</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            From wallet connection to cross-chain credentials in four steps.
          </motion.p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line (desktop) */}
          <div className="hidden lg:block absolute top-24 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-blue-500 via-primary to-orange-500" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i }}
                className="relative"
              >
                {/* Arrow connector (mobile/tablet) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:flex lg:hidden absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-primary" />
                  </div>
                )}

                <div className="p-6 rounded-2xl bg-background border border-border hover:border-primary/30 transition-all h-full">
                  {/* Step number and icon */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${step.color} flex items-center justify-center`}>
                      <step.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-3xl font-black text-muted-foreground/30">{step.number}</span>
                  </div>

                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{step.description}</p>

                  {/* Technical detail */}
                  <code className="block text-xs font-mono bg-muted px-3 py-2 rounded-lg text-muted-foreground overflow-x-auto">
                    {step.technical}
                  </code>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Data Flow Diagram */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-16"
        >
          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-6 md:p-8 overflow-x-auto">
            <h4 className="text-sm font-mono text-zinc-400 mb-6">DATA FLOW</h4>

            {/* ASCII-style flow diagram */}
            <div className="font-mono text-xs md:text-sm text-zinc-300 whitespace-pre leading-relaxed">
              <div className="flex flex-wrap items-center gap-2 md:gap-4">
                <span className="px-3 py-1.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Agent Wallet
                </span>
                <ArrowRight className="w-4 h-4 text-zinc-600" />
                <span className="px-3 py-1.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <JargonTooltip {...jargonDefinitions.pda} showIcon={false}>Solana PDA</JargonTooltip>
                </span>
                <ArrowRight className="w-4 h-4 text-zinc-600" />
                <span className="px-3 py-1.5 rounded bg-primary/20 text-primary border border-primary/30">
                  <JargonTooltip {...jargonDefinitions.ghostScore} showIcon={false}>Ghost Score</JargonTooltip>
                </span>
                <ArrowRight className="w-4 h-4 text-zinc-600" />
                <span className="px-3 py-1.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <JargonTooltip {...jargonDefinitions.verifiableCredentials} showIcon={false}>W3C VC</JargonTooltip>
                </span>
              </div>

              <div className="mt-6 pt-6 border-t border-zinc-800 flex flex-wrap gap-6 text-zinc-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>On-chain verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Ed25519 signatures</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>IPFS credential storage</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>EVM bridge via Crossmint</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
