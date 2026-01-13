'use client'

import { motion } from 'framer-motion'
import { Building2, Network, TrendingUp, Users, ArrowUpRight } from 'lucide-react'
import { useScrollReveal } from '@/lib/animations/hooks'

/**
 * BentoUseCases - Bento grid layout for use cases with enhanced interactions
 *
 * Features:
 * - Mixed-size card grid (bento layout)
 * - Hover lift effects with shadows
 * - Icon rotations on hover
 * - Gradient background shifts
 * - Stagger reveal animations
 * - Magnetic hover effects
 */
export function BentoUseCases() {
  const { ref: headerRef, isInView: headerInView } = useScrollReveal(0.2, true)
  const { ref: gridRef, isInView: gridInView } = useScrollReveal(0.1, true)

  const useCases = [
    {
      icon: Building2,
      title: 'AI Marketplaces',
      description:
        'Integrate Ghost Score to reduce fraud and increase trust in AI agent transactions',
      stat: '87% Fraud Reduction',
      gradient: 'from-blue-500/20 to-blue-500/5',
      size: 'large', // Takes 2 columns on desktop
    },
    {
      icon: Network,
      title: 'Agent Networks',
      description: 'Build multi-agent systems with verifiable reputation',
      stat: '0-1000 Trust Score',
      gradient: 'from-purple-500/20 to-purple-500/5',
      size: 'small',
    },
    {
      icon: TrendingUp,
      title: 'Payment Tracking',
      description: 'PayAI and x402 protocol integration for reputation tracking',
      stat: '$50M+ Tracked',
      gradient: 'from-green-500/20 to-green-500/5',
      size: 'small',
    },
    {
      icon: Users,
      title: 'Enterprise Teams',
      description: 'Manage internal AI agent fleets with unified reputation',
      stat: '10K+ Agents',
      gradient: 'from-orange-500/20 to-orange-500/5',
      size: 'medium',
    },
  ]

  return (
    <section className="py-24 sm:py-32 md:py-40 bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,var(--primary)/5,transparent_50%)]" />

      {/* Dot matrix background */}
      <div className="absolute inset-0 opacity-[0.015]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono uppercase tracking-widest backdrop-blur-xl mb-6">
            Use Cases
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter mb-6">
            Built for <span className="text-primary italic">Every Scale</span>
          </h2>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From startups to enterprises, GhostSpeak powers reputation and identity for AI agents
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {useCases.map((useCase: any, i: number) => {
            const isLarge = useCase.size === 'large'
            const isMedium = useCase.size === 'medium'

            return (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 40 }}
                animate={gridInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className={`group relative ${
                  isLarge
                    ? 'md:col-span-2'
                    : isMedium
                      ? 'md:col-span-2 lg:col-span-1'
                      : 'md:col-span-1'
                }`}
              >
                <motion.div
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="relative h-full p-8 rounded-3xl bg-card border border-border hover:border-primary/40 transition-all duration-300 overflow-hidden cursor-pointer"
                >
                  {/* Gradient background that shifts on hover */}
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${useCase.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  />

                  {/* Glow effect on hover */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 0%, rgba(var(--primary-rgb), 0.1), transparent 50%)',
                    }}
                  />

                  {/* Content */}
                  <div className="relative z-10 h-full flex flex-col">
                    {/* Icon and stat */}
                    <div className="flex items-start justify-between mb-6">
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6, ease: 'easeInOut' }}
                        className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors"
                      >
                        <useCase.icon className="w-8 h-8 text-primary" />
                      </motion.div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-primary">
                          {useCase.stat.split(' ')[0]}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {useCase.stat.split(' ').slice(1).join(' ')}
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl md:text-3xl font-bold mb-3 group-hover:text-primary transition-colors">
                      {useCase.title}
                    </h3>

                    {/* Description */}
                    <p className="text-muted-foreground mb-auto leading-relaxed">
                      {useCase.description}
                    </p>

                    {/* Learn more link */}
                    <motion.div
                      className="flex items-center gap-2 text-primary font-medium mt-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      whileHover={{ x: 5 }}
                    >
                      <span>Explore</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </motion.div>
                  </div>

                  {/* Hover border effect */}
                  <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="absolute inset-0 rounded-3xl shadow-[0_0_40px_rgba(var(--primary-rgb),0.15)]" />
                  </div>
                </motion.div>
              </motion.div>
            )
          })}
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={gridInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8 rounded-2xl bg-card/50 border border-border backdrop-blur-sm"
        >
          {[
            { label: 'Status', value: 'Live' },
            { label: 'Network', value: 'Mainnet' },
            { label: 'Integrations', value: '3+' },
            { label: 'Starting Score', value: '1,000' },
          ].map((stat: any, i: number) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className="text-center p-4 rounded-xl hover:bg-primary/5 transition-colors cursor-default"
            >
              <div className="text-3xl font-black text-primary mb-1">{stat.value}</div>
              <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
