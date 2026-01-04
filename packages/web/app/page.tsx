'use client'

import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Hero } from '@/components/landing/Hero'
import { BentoGrid } from '@/components/landing/BentoGrid'
import { GhostIcon } from '@/components/shared/GhostIcon'
import { ManifestoSection } from '@/components/landing/ManifestoSection'
import { ArchitectureLayers } from '@/components/landing/ArchitectureLayers'
import { ClaimGhost } from '@/components/landing/ClaimGhost'
import { IntegrationMarquee } from '@/components/landing/IntegrationMarquee'
import { IdentityBridge } from '@/components/landing/IdentityBridge'
import { DeveloperIntegration } from '@/components/landing/DeveloperIntegration'
import { UseCases } from '@/components/landing/UseCases'
import { FlyingGhost } from '@/components/landing/FlyingGhost'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export default function LandingPage() {
  const pageRef = useRef<HTMLDivElement>(null)

  // Setup scroll-triggered animations
  useEffect(() => {
    if (!pageRef.current) return

    const ctx = gsap.context(() => {
      // Animate sections on scroll
      gsap.utils.toArray<HTMLElement>('.animate-on-scroll').forEach((section) => {
        gsap.from(section, {
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            end: 'top 20%',
            toggleActions: 'play none none reverse',
          },
          opacity: 0,
          y: 60,
          duration: 1,
          ease: 'power3.out',
        })
      })

      // Stagger animations for grid items
      gsap.utils.toArray<HTMLElement>('.stagger-item').forEach((item, index) => {
        gsap.from(item, {
          scrollTrigger: {
            trigger: item,
            start: 'top 85%',
          },
          opacity: 0,
          y: 40,
          duration: 0.8,
          delay: index * 0.1,
          ease: 'power2.out',
        })
      })
    }, pageRef)

    return () => ctx.revert()
  }, [])

  return (
    <div
      ref={pageRef}
      className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30"
    >
      {/* 1. Hero Section */}
      <Hero />

      {/* 2. Integration Marquee */}
      <div className="animate-on-scroll">
        <IntegrationMarquee />
      </div>

      {/* 3. Manifesto - High Impact Brand Statement */}
      <div className="animate-on-scroll">
        <ManifestoSection />
      </div>



      {/* 6. Architecture Deep Dive */}
      <div className="animate-on-scroll">
        <ArchitectureLayers />
      </div>

      {/* 7. Claim Ghost */}
      <div className="animate-on-scroll">
        <ClaimGhost />
      </div>

      {/* 8. Cross-Chain Identity Bridge */}
      <div className="animate-on-scroll">
        <IdentityBridge />
      </div>

      {/* 9. Use Cases */}
      <div className="animate-on-scroll">
        <UseCases />
      </div>

      {/* 10. Developer Integration */}
      <div className="animate-on-scroll">
        <DeveloperIntegration />
      </div>

      {/* 11. Flying Ghost Section */}
      <FlyingGhost />

      {/* 12. Features Grid (Bento) */}
      <section className="animate-on-scroll py-16 sm:py-24 md:py-32 relative border-t border-border">
        <div className="max-w-7xl mx-auto px-4 mb-10 sm:mb-16 md:mb-20 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight">
            Built on <span className="text-primary italic">PayAI</span>. Extended by GhostSpeak.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mt-3 sm:mt-4 px-2">
            PayAI handles payments. GhostSpeak adds credentials, scores, and on-chain trust.
          </p>
        </div>
        <BentoGrid />
      </section>

      {/* 6. Footer */}
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
              href="https://dexscreener.com/solana/e44xj7jyjxyermlqqwrpu4nekcphawfjf3ppn2uokgdb"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              BUY GHOST
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
