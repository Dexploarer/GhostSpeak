'use client'

import { useEffect, useRef } from 'react'
import { Hero } from '@/components/landing/Hero'
import { GhostIcon } from '@/components/shared/GhostIcon'
import { ManifestoSection } from '@/components/landing/ManifestoSection'
import { IntegrationMarquee } from '@/components/landing/IntegrationMarquee'
import { DeveloperIntegration } from '@/components/landing/DeveloperIntegration'
import { BentoUseCases } from '@/components/landing/BentoUseCases'
import { CaisperCTA } from '@/components/landing/CaisperCTA'
import { TechnicalFlow } from '@/components/landing/TechnicalFlow'
import { FloatingGhostScroll } from '@/components/landing/FloatingGhostScroll'
import { CursorFollower } from '@/components/animations/CursorFollower'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export default function LandingPage() {
  const pageRef = useRef<HTMLDivElement>(null)

  // Setup scroll-triggered animations for remaining sections
  useEffect(() => {
    if (!pageRef.current) return

    const ctx = gsap.context(() => {
      // Animate sections on scroll with smoother easing
      gsap.utils.toArray<HTMLElement>('.animate-on-scroll').forEach((section) => {
        gsap.from(section, {
          scrollTrigger: {
            trigger: section,
            start: 'top 75%',
            end: 'top 25%',
            toggleActions: 'play none none reverse',
          },
          opacity: 0,
          y: 80,
          duration: 1.2,
          ease: 'power4.out',
        })
      })

      // Enhanced stagger animations for grid items
      gsap.utils.toArray<HTMLElement>('.stagger-item').forEach((item, index) => {
        gsap.from(item, {
          scrollTrigger: {
            trigger: item,
            start: 'top 85%',
          },
          opacity: 0,
          y: 50,
          scale: 0.95,
          duration: 1,
          delay: index * 0.08,
          ease: 'back.out(1.4)',
        })
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  return (
    <div
      ref={pageRef}
      className="relative min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30"
    >
      {/* Custom cursor follower (desktop only) */}
      <CursorFollower />

      {/* Floating ghosts that drift across as user scrolls */}
      <FloatingGhostScroll />

      {/* 1. Enhanced Hero - Value Proposition with advanced animations */}
      <Hero />

      {/* 2. Social Proof */}
      <div className="animate-on-scroll">
        <IntegrationMarquee />
      </div>

      {/* 3. What is GhostSpeak */}
      <div className="animate-on-scroll">
        <ManifestoSection />
      </div>

      {/* 4. How It Works - Interactive Flow */}
      <TechnicalFlow />

      {/* 5. Try It - Enhanced Caisper Demo with 3D effects */}
      <CaisperCTA />

      {/* 6. Use Cases - Bento Grid Layout */}
      <BentoUseCases />

      {/* 7. For Developers */}
      <div className="animate-on-scroll">
        <DeveloperIntegration />
      </div>

      {/* Footer */}
      <footer className="py-12 sm:py-16 md:py-24 border-t border-border bg-card/80 relative">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-6 sm:gap-8 md:gap-12 text-center">
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-xl sm:rounded-2xl flex items-center justify-center rotate-3 hover:rotate-0 transition-transform cursor-pointer shadow-[0_0_30px_rgba(204,255,0,0.3)]">
              <GhostIcon variant="logo" size={28} className="text-primary-foreground sm:hidden" />
              <GhostIcon
                variant="logo"
                size={40}
                className="text-primary-foreground hidden sm:block"
              />
            </div>
            <span className="font-black text-2xl sm:text-3xl tracking-tighter">GhostSpeak</span>
          </div>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 text-xs sm:text-sm text-muted-foreground font-mono">
            <a
              href="https://docs.ghostspeak.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              DOCS
            </a>
            <a
              href="https://github.com/ghostspeak/ghostspeak"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              GITHUB
            </a>
            <a
              href="https://x.com/ghostspeak_io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              X
            </a>
          </div>

          {/* Contact */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 text-[10px] sm:text-xs text-muted-foreground/60">
            <a
              href="mailto:team@ghostspeak.io"
              className="hover:text-muted-foreground transition-colors"
            >
              team@ghostspeak.io
            </a>
          </div>

          <div className="text-[9px] sm:text-[10px] text-muted-foreground/60 font-mono tracking-widest uppercase">
            &copy; 2026 GhostSpeak Labs • Secured by Solana
          </div>
        </div>

        {/* Final Status Indicator */}
        <div className="mt-6 sm:mt-8 md:mt-12 flex justify-center items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] font-mono">
          <span className="text-primary animate-pulse italic">NETWORK_STATUS: OPERATIONAL</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span className="text-muted-foreground/40">FINALITY: &lt; 400ms</span>
        </div>
      </footer>
    </div>
  )
}
