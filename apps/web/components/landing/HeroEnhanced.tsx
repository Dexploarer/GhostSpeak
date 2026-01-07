'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { GhostParticles } from './GhostParticles'
import { MagneticButton } from '@/components/animations/MagneticButton'
import { useMouseParallax } from '@/lib/animations/hooks'
import gsap from 'gsap'
import { useWallet } from '@/lib/wallet/WalletStandardProvider'
import { useWalletModal } from '@/lib/wallet/WalletModal'
import { useRouter } from 'next/navigation'
import { JargonTooltip, jargonDefinitions } from '../shared/JargonTooltip'

/**
 * HeroEnhanced - Premium hero section with advanced animations
 *
 * Features:
 * - 3D text parallax on mouse movement
 * - Magnetic CTAs with smooth spring physics
 * - Enhanced ghost particle system
 * - Scroll-based fade and scale effects
 * - Staggered reveal animations
 * - Floating stat pills with micro-interactions
 * - Radial gradient overlays with pulse animations
 */
export function HeroEnhanced() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { publicKey } = useWallet()
  const { setVisible } = useWalletModal()
  const router = useRouter()

  // Mouse parallax for 3D depth
  const mouseParallax = useMouseParallax(0.015)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })

  const particleScroll = useTransform(scrollYProgress, [0, 1], [0, 1])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95])
  const y = useTransform(scrollYProgress, [0, 1], [0, -100])

  const handlePortalClick = () => {
    if (publicKey) {
      router.push('/dashboard')
    } else {
      setVisible(true)
    }
  }

  // GSAP entrance animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title reveal with character split effect
      gsap.from('.hero-title-line', {
        opacity: 0,
        y: 120,
        rotationX: -90,
        transformOrigin: 'center bottom',
        delay: 0.2,
        duration: 1.4,
        stagger: 0.15,
        ease: 'power4.out',
      })

      // Subtitle and CTA stagger
      gsap.from('.hero-subtitle', {
        opacity: 0,
        y: 40,
        delay: 0.8,
        duration: 1.2,
        ease: 'power3.out',
      })

      gsap.from('.hero-cta', {
        opacity: 0,
        y: 30,
        scale: 0.9,
        delay: 1.2,
        duration: 0.8,
        stagger: 0.1,
        ease: 'back.out(1.4)',
      })

      // Stat pills entrance
      gsap.from('.stat-pill', {
        opacity: 0,
        y: 30,
        scale: 0.8,
        delay: 1.6,
        duration: 0.6,
        stagger: 0.08,
        ease: 'back.out(2)',
      })
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <motion.div
      ref={containerRef}
      style={{ opacity, scale, y }}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background perspective-2000"
    >
      {/* Animated background gradients */}
      <div className="absolute inset-0 z-0">
        {/* Pulsing orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/10 rounded-full blur-[150px] pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
          className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"
        />
      </div>

      {/* Radial gradient overlay with vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--background)_85%)] z-10 pointer-events-none" />

      {/* Enhanced ghost particle animation */}
      <div className="absolute inset-0 z-0">
        <GhostParticles scrollProgress={particleScroll.get()} />
      </div>

      {/* Main content with parallax */}
      <div className="relative z-20 w-full max-w-[1600px] mx-auto px-6 md:px-12 lg:px-16 py-32">
        <div className="flex flex-col items-center justify-center text-center space-y-12">
          {/* Main headline with 3D parallax */}
          <motion.div
            className="space-y-2 preserve-3d"
            style={{
              rotateX: useTransform(() => mouseParallax.y * -0.5),
              rotateY: useTransform(() => mouseParallax.x * 0.5),
            }}
          >
            <h1 className="hero-title-line text-[clamp(60px,10vw,140px)] font-black tracking-tighter leading-[0.9] text-foreground">
              Trust Layer
            </h1>
            <h2 className="hero-title-line text-[clamp(60px,10vw,140px)] font-black tracking-tighter leading-[0.9] relative">
              <span className="relative inline-block">
                <span className="text-primary italic">for AI</span>
                {/* Animated underline */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1.5, duration: 0.8, ease: 'easeOut' }}
                  className="absolute -bottom-2 left-0 right-0 h-1 bg-primary/30 origin-left"
                />
              </span>
            </h2>
          </motion.div>

          {/* Subtitle with fade-in */}
          <div className="hero-subtitle">
            <p className="text-xl md:text-2xl text-foreground/80 max-w-2xl mx-auto leading-relaxed">
              On-chain reputation and verifiable credentials for{' '}
              <span className="text-primary font-semibold">AI agents on Solana</span>
            </p>
          </div>

          {/* CTA Buttons with magnetic effect */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <MagneticButton strength={0.25} className="hero-cta">
              <Link href="https://docs.ghostspeak.io" target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  className="h-16 px-10 rounded-2xl text-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_50px_rgba(var(--primary-rgb),0.3)] group relative overflow-hidden"
                >
                  {/* Animated gradient overlay */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                  />
                  <span className="relative z-10 flex items-center">
                    Read Our Docs
                    <ArrowRight className="ml-2 w-6 h-6 transition-transform group-hover:translate-x-1" />
                  </span>
                </Button>
              </Link>
            </MagneticButton>

            <MagneticButton strength={0.25} className="hero-cta">
              <Button
                onClick={handlePortalClick}
                variant="outline"
                size="lg"
                className="h-16 px-10 rounded-2xl text-lg border-2 border-primary/30 text-foreground hover:bg-primary/10 hover:border-primary transition-all backdrop-blur-xl relative overflow-hidden group"
              >
                <motion.div
                  className="absolute inset-0 bg-primary/5"
                  initial={{ scale: 0 }}
                  whileHover={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                />
                <span className="relative z-10">Portal</span>
              </Button>
            </MagneticButton>
          </div>

          {/* Enhanced stat pills with hover effects */}
          <div className="mt-16 flex flex-wrap gap-4 justify-center">
            <motion.div
              className="stat-pill group px-8 py-4 rounded-full bg-card/60 border border-border/50 backdrop-blur-xl hover:border-primary/50 hover:bg-primary/5 transition-all cursor-default relative overflow-hidden"
              whileHover={{ scale: 1.05, y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              />
              <div className="relative z-10">
                <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
                  Credentials
                </div>
                <div className="text-base font-bold text-primary">
                  <JargonTooltip {...jargonDefinitions.w3c} showIcon={false}>
                    W3C Standard
                  </JargonTooltip>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="stat-pill group px-8 py-4 rounded-full bg-card/60 border border-border/50 backdrop-blur-xl hover:border-primary/50 hover:bg-primary/5 transition-all cursor-default relative overflow-hidden"
              whileHover={{ scale: 1.05, y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.8, ease: 'easeInOut', delay: 0.1 }}
              />
              <div className="relative z-10">
                <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
                  <JargonTooltip {...jargonDefinitions.ghostScore} showIcon={false}>
                    Ghost Score
                  </JargonTooltip>
                </div>
                <div className="text-base font-bold text-primary">0-10,000</div>
              </div>
            </motion.div>

            <motion.div
              className="stat-pill group px-8 py-4 rounded-full bg-card/60 border border-border/50 backdrop-blur-xl hover:border-primary/50 hover:bg-primary/5 transition-all cursor-default relative overflow-hidden"
              whileHover={{ scale: 1.05, y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.8, ease: 'easeInOut', delay: 0.2 }}
              />
              <div className="relative z-10">
                <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
                  <JargonTooltip {...jargonDefinitions.crossChain} showIcon={false}>
                    Cross-Chain
                  </JargonTooltip>
                </div>
                <div className="text-base font-bold text-primary">
                  <JargonTooltip {...jargonDefinitions.solana} showIcon={false}>
                    Solana
                  </JargonTooltip>
                  {' → '}
                  <JargonTooltip {...jargonDefinitions.evm} showIcon={false}>
                    EVM
                  </JargonTooltip>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Scanline effect */}
      <div className="scanline" />
    </motion.div>
  )
}