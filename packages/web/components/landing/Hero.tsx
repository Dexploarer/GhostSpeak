'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { GhostParticles } from './GhostParticles'
import gsap from 'gsap'

/**
 * Hero - Premium split-layout hero section
 *
 * Features:
 * - Split headline layout with dramatic 120-180px typography
 * - Ghost particle animation background
 * - GSAP stagger animations on mount
 * - Scroll-based parallax and fade effects
 * - Radial gradient overlays and glowing orbs
 * - Responsive design with mobile optimizations
 *
 * Layout:
 * - "Trust" (top-center)
 * - "Layer" (bottom-left)
 * - "for AI" (bottom-right, lime highlighted)
 * - CTA section (bottom-left with stats pills)
 */
export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })

  const particleScroll = useTransform(scrollYProgress, [0, 1], [0, 1])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8])

  // GSAP text reveal animations
  useEffect(() => {
    const animations = [
      { selector: '.hero-headline', delay: 0.3, y: 100, duration: 1.2, stagger: 0.2, ease: 'power4.out' },
      { selector: '.hero-cta', delay: 1, y: 40, duration: 1, ease: 'power3.out' },
      { selector: '.version-badge', delay: 0.5, scale: 0.8, duration: 0.8, ease: 'back.out' },
    ]

    const ctx = gsap.context(() => {
      animations.forEach(({ selector, ...props }) => {
        gsap.from(selector, { opacity: 0, ...props })
      })
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <motion.div
      ref={containerRef}
      style={{ opacity, scale }}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background"
    >
      {/* Radial Gradient Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,var(--background)_80%)] z-10 pointer-events-none" />

      {/* Ghost Particle Animation */}
      <div className="absolute inset-0 z-0">
        <GhostParticles scrollProgress={particleScroll.get()} />
      </div>

      {/* Background Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] -z-10 pointer-events-none animate-pulse-glow" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <div className="relative z-20 w-full max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16 py-32">
        {/* Version Badge */}
        <div className="absolute top-8 left-8 version-badge">
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-mono uppercase tracking-widest text-primary backdrop-blur-xl shadow-[0_0_30px_rgba(var(--primary-rgb),0.15)]">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
            v1.0.4-Stable
          </div>
        </div>

        {/* Split Headlines */}
        <div className="relative min-h-[70vh] flex flex-col justify-center">
          {/* "Trust" - Top Center */}
          <div className="hero-headline absolute top-[10%] left-1/2 -translate-x-1/2">
            <h1 className="text-[clamp(80px,12vw,180px)] font-black tracking-tighter leading-none text-foreground">
              Trust
            </h1>
          </div>

          {/* "Layer" - Bottom Left */}
          <div className="hero-headline absolute bottom-[20%] left-0">
            <h1 className="text-[clamp(80px,12vw,180px)] font-black tracking-tighter leading-none text-foreground">
              Layer
            </h1>
          </div>

          {/* "for AI" - Bottom Right with lime highlight */}
          <div className="hero-headline absolute bottom-[10%] right-0">
            <h1 className="text-[clamp(80px,12vw,180px)] font-black tracking-tighter leading-none text-primary italic relative">
              for AI
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 1.5, duration: 1.2, ease: 'easeOut' }}
                className="absolute -bottom-2 left-0 h-2 md:h-3 bg-primary/30 blur-sm"
              />
            </h1>
          </div>
        </div>

        {/* CTA Section - Bottom Left */}
        <div className="hero-cta absolute bottom-16 left-0">
          <p className="text-xl md:text-2xl text-foreground max-w-xl mb-8 leading-relaxed">
            The only x402 marketplace with
            <br />
            <span className="text-primary font-semibold">escrow, reputation, and disputes.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="h-14 px-8 rounded-xl text-base bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_40px_rgba(var(--primary-rgb),0.25)] group"
              >
                Access Protocol
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="https://docs.ghostspeak.io">
              <Button
                variant="outline"
                size="lg"
                className="h-14 px-8 rounded-xl text-base border-2 border-primary/30 text-foreground hover:bg-primary/10 hover:border-primary transition-all"
              >
                Read Our Docs
              </Button>
            </Link>
          </div>

          {/* Stats Pills */}
          <div className="mt-12 flex flex-wrap gap-4">
            {[
              { label: 'Credentials', value: 'W3C' },
              { label: 'Ghost Score', value: '0-1000' },
              { label: 'Cross-Chain', value: 'Solana→EVM' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 + index * 0.1 }}
                className="group px-6 py-3 rounded-full bg-card/60 border border-border/50 backdrop-blur-xl hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
                  {stat.label}
                </div>
                <div className="text-sm font-bold text-primary group-hover:text-primary transition-colors">
                  {stat.value}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Scanline Effect */}
      <div className="scanline" />
    </motion.div>
  )
}
