'use client'

import { useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Sparkles, ArrowRight, Shield, Zap, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export function ClaimGhost() {
  const containerRef = useRef<HTMLDivElement>(null)
  const coinRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<HTMLDivElement>(null)

  // Scroll-based slide animation
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  const coinX = useTransform(scrollYProgress, [0, 0.5, 1], [-400, 0, 400])
  const coinOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0])
  const coinScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8])
  const coinRotate = useTransform(scrollYProgress, [0, 0.5, 1], [-15, 0, 15])

  useEffect(() => {
    if (!containerRef.current || !titleRef.current || !cardsRef.current) return

    const ctx = gsap.context(() => {
      // Timeline for coordinated entrance
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 70%',
          end: 'top 20%',
          toggleActions: 'play none none reverse',
        },
      })

      // Title stagger
      tl.from(
        '.claim-title',
        {
          y: 80,
          opacity: 0,
          duration: 1,
          stagger: 0.15,
          ease: 'power4.out',
        },
        0.3
      )

      // Cards cascade in
      tl.from(
        '.claim-card',
        {
          x: -100,
          opacity: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
        },
        '-=0.5'
      )

      // CTA button
      tl.from(
        '.claim-cta',
        {
          scale: 0.8,
          opacity: 0,
          duration: 0.6,
          ease: 'back.out(2)',
        },
        '-=0.3'
      )

      // Removed floating animation - using scroll-based motion instead

      // Particle animations
      gsap.utils.toArray<HTMLElement>('.particle').forEach((particle, i) => {
        gsap.to(particle, {
          y: -100,
          x: gsap.utils.random(-50, 50),
          opacity: 0,
          duration: gsap.utils.random(2, 4),
          repeat: -1,
          delay: i * 0.3,
          ease: 'power1.out',
        })
      })

      // Glow pulse
      gsap.to('.coin-glow', {
        scale: 1.3,
        opacity: 0.2,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
    }, containerRef)

    return () => ctx.revert()
  }, [])

  const features = [
    {
      icon: Shield,
      title: 'Discover Your Ghost',
      desc: 'Check if your agent has an on-chain identity from x402 payments',
      color: 'from-primary/20 to-primary/5',
    },
    {
      icon: Trophy,
      title: 'View Your Score',
      desc: 'See your Ghost Score (0-1000) calculated from transaction history',
      color: 'from-primary/15 to-transparent',
    },
    {
      icon: Zap,
      title: 'Claim & Own It',
      desc: 'Register ownership and unlock full reputation features',
      color: 'from-primary/10 to-transparent',
    },
  ]

  return (
    <section
      ref={containerRef}
      className="py-24 sm:py-32 md:py-40 bg-background relative overflow-hidden border-t border-border"
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary)/8,transparent_70%)]" />
      <div className="coin-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/30 rounded-full blur-[200px] pointer-events-none" />

      {/* Floating particles - using fixed positions to avoid hydration mismatch */}
      <div ref={particlesRef} className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { x: 10, size: 3 },
          { x: 25, size: 4 },
          { x: 40, size: 2.5 },
          { x: 55, size: 5 },
          { x: 68, size: 3.5 },
          { x: 78, size: 4.5 },
          { x: 15, size: 2 },
          { x: 50, size: 3 },
          { x: 85, size: 4 },
          { x: 32, size: 2.5 },
          { x: 72, size: 5.5 },
          { x: 92, size: 3 },
        ].map((particle, i) => (
          <div
            key={i}
            className="particle absolute"
            style={{
              left: `${particle.x}%`,
              bottom: '0%',
              width: `${particle.size}px`,
              height: `${particle.size}px`,
            }}
          >
            <div className="w-full h-full rounded-full bg-primary/40 blur-sm" />
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left side - Dramatic coin visual with scroll zoom */}
          <div className="relative flex items-center justify-center lg:justify-end">
            <motion.div
              ref={coinRef}
              style={{
                x: coinX,
                opacity: coinOpacity,
                scale: coinScale,
                rotate: coinRotate,
              }}
              className="relative w-[280px] h-[280px] sm:w-[400px] sm:h-[400px] flex items-center justify-center"
            >
              {/* Glow rings */}
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute inset-4 rounded-full border-2 border-primary/30" />
              <div className="absolute inset-8 rounded-full border border-primary/20" />

              {/* Coin image */}
              <div className="relative z-10 w-[200px] h-[200px] sm:w-[280px] sm:h-[280px]">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent rounded-full blur-2xl" />
                <Image
                  src="/ghost-coin.png"
                  alt="Ghost Coin"
                  width={280}
                  height={280}
                  className="relative z-10 drop-shadow-[0_0_60px_rgba(204,255,0,0.4)]"
                  style={{
                    filter: 'drop-shadow(0 0 40px rgba(204, 255, 0, 0.6))',
                  }}
                />
              </div>

              {/* Static accent dots */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary/60" />
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary/40" />
            </motion.div>
          </div>

          {/* Right side - Content */}
          <div className="space-y-8" ref={titleRef}>
            {/* Badge */}
            <div className="claim-title inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono uppercase tracking-widest backdrop-blur-xl">
              <Sparkles className="w-4 h-4" />
              Agent Identity
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h2 className="claim-title text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-[0.95]">
                Claim Your{' '}
                <span className="text-primary italic block mt-2">Ghost</span>
              </h2>
              <p className="claim-title text-xl sm:text-2xl text-muted-foreground font-light leading-relaxed max-w-xl">
                Your agent already has a reputation score - you just don&apos;t know it yet.
              </p>
            </div>

            {/* Feature cards */}
            <div ref={cardsRef} className="space-y-4 pt-4">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="claim-card group p-6 rounded-2xl bg-gradient-to-br from-card/80 to-card/40 border border-border/50 hover:border-primary/40 transition-all duration-300 backdrop-blur-sm hover:shadow-[0_0_30px_rgba(204,255,0,0.1)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <feature.icon className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="claim-cta pt-6">
              <Link href="https://docs.ghostspeak.io" target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  className="h-16 px-10 rounded-2xl text-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_50px_rgba(204,255,0,0.3)] group"
                >
                  Check Your Ghost
                  <ArrowRight className="ml-3 w-6 h-6 transition-transform group-hover:translate-x-2" />
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground/60 mt-4 font-mono">
                10,000+ Ghosts created from historical x402 transactions
              </p>
            </div>
          </div>
        </div>
      </div>

    </section>
  )
}
