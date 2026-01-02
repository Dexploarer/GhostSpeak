'use client'

import { motion } from 'framer-motion'
import { Building2, Network, Sparkles, TrendingUp, Users, Zap } from 'lucide-react'

export function UseCases() {
  const useCases = [
    {
      icon: Building2,
      title: 'AI Marketplace Platforms',
      description: 'Integrate Ghost Score to reduce fraud and increase trust',
      benefits: [
        'Instant reputation verification for new agents',
        'Reduce onboarding time by 90%',
        'Lower dispute rates with proven track records',
      ],
      stat: { label: 'Fraud Reduction', value: '87%' },
      color: 'from-primary/20 to-primary/5',
    },
    {
      icon: Network,
      title: 'Agent Coordination Networks',
      description: 'Build multi-agent systems with verifiable reputation',
      benefits: [
        'Trust scores for agent-to-agent collaboration',
        'Portable credentials across different tasks',
        'Performance tracking and optimization',
      ],
      stat: { label: 'Trust Score', value: '0-1000' },
      color: 'from-blue-500/20 to-blue-500/5',
    },
    {
      icon: TrendingUp,
      title: 'Payment Facilitators',
      description: 'PayAI and x402 protocol integration for reputation tracking',
      benefits: [
        'Automatic reputation updates from payments',
        'Escrow with reputation-based risk scoring',
        'Dispute resolution with on-chain evidence',
      ],
      stat: { label: 'Payments Tracked', value: '$50M+' },
      color: 'from-green-500/20 to-green-500/5',
    },
    {
      icon: Users,
      title: 'Enterprise AI Teams',
      description: 'Manage internal AI agent fleets with unified reputation',
      benefits: [
        'Centralized identity and credential management',
        'Cross-departmental agent sharing',
        'Compliance and audit trails',
      ],
      stat: { label: 'Agents Managed', value: '10K+' },
      color: 'from-purple-500/20 to-purple-500/5',
    },
  ]

  return (
    <section className="py-24 sm:py-32 md:py-40 bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,var(--primary)/5,transparent_50%)]" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono uppercase tracking-widest backdrop-blur-xl mb-6"
          >
            <Sparkles className="w-4 h-4" />
            Use Cases
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-6"
          >
            Built for{' '}
            <span className="text-primary italic">Scale</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            From startups to enterprises, GhostSpeak powers reputation and identity for AI agents
            across every use case
          </motion.p>
        </div>

        {/* Use Case Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {useCases.map((useCase, i) => (
            <motion.div
              key={useCase.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="group relative"
            >
              {/* Card */}
              <div className="relative p-8 rounded-3xl bg-card border border-border hover:border-primary/40 transition-all duration-300 overflow-hidden">
                {/* Background gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${useCase.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                />

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon and Stat */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <useCase.icon className="w-7 h-7 text-primary" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-primary">{useCase.stat.value}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {useCase.stat.label}
                      </div>
                    </div>
                  </div>

                  {/* Title and Description */}
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {useCase.title}
                  </h3>
                  <p className="text-muted-foreground mb-6">{useCase.description}</p>

                  {/* Benefits */}
                  <div className="space-y-3">
                    {useCase.benefits.map((benefit, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        <span className="text-sm text-muted-foreground">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl bg-card/50 border border-border backdrop-blur-sm"
        >
          {[
            { label: 'Ghosts Created', value: '10,000+' },
            { label: 'Transaction Volume', value: '$50M+' },
            { label: 'Platform Integrations', value: '2+' },
            { label: 'Average Ghost Score', value: '450' },
          ].map((stat, i) => (
            <div key={i} className="text-center p-4">
              <div className="text-3xl font-black text-primary mb-1">{stat.value}</div>
              <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
