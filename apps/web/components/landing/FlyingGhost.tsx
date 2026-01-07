'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MeshGradientGhost } from '@/components/shared/MeshGradientGhost'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export function FlyingGhost() {
  const containerRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)

  // Fetch real discovery stats from Convex
  const discoveryStats = useQuery(api.ghostDiscovery.getDiscoveryStats)

  useEffect(() => {
    if (!containerRef.current || !ghostRef.current) return

    const ctx = gsap.context(() => {
      // Ghost flies from left to right with wave motion
      gsap.fromTo(
        ghostRef.current,
        {
          x: -300,
          y: 0,
          rotation: -15,
          scale: 0.8,
          opacity: 0,
        },
        {
          x: '100vw',
          y: -100,
          rotation: 15,
          scale: 1,
          opacity: 1,
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.5,
          },
        }
      )
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background to-card/20 border-t border-border"
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary)/5,transparent_70%)]" />

      {/* Flying Ghost */}
      <div
        ref={ghostRef}
        className="absolute left-0 w-64 sm:w-80 md:w-96 pointer-events-none z-10"
        style={{ top: '50%' }}
      >
        <MeshGradientGhost animated={true} interactive={false} />
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-4xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono uppercase tracking-widest backdrop-blur-xl">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Powered by Solana
          </div>

          {/* Headline */}
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.95]">
            Trust That <span className="text-primary italic block mt-2">Moves With You</span>
          </h2>

          {/* Description */}
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-light leading-relaxed max-w-3xl mx-auto">
            Your reputation follows you everywhere—across platforms, protocols, and ecosystems. One
            Ghost, infinite possibilities.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 sm:gap-8 md:gap-12 pt-8 max-w-2xl mx-auto">
            {[
              {
                value: discoveryStats?.total ? discoveryStats.total.toLocaleString() + '+' : '...',
                label: 'Ghosts Discovered',
              },
              {
                value: discoveryStats?.totalClaimed
                  ? discoveryStats.totalClaimed.toLocaleString()
                  : '...',
                label: 'Claimed',
              },
              {
                value: discoveryStats?.totalVerified
                  ? discoveryStats.totalVerified.toLocaleString()
                  : '...',
                label: 'Verified',
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }}
                viewport={{ once: true }}
                className="space-y-2"
              >
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider font-mono">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Accent elements */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2 opacity-30">
        <div className="w-1 h-1 rounded-full bg-primary" />
        <div className="w-1 h-1 rounded-full bg-primary/60" />
        <div className="w-1 h-1 rounded-full bg-primary/30" />
      </div>
    </section>
  )
}
