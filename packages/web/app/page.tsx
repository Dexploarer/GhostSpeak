'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Hero } from '@/components/landing/Hero'
import { BentoGrid } from '@/components/landing/BentoGrid'
import dynamic from 'next/dynamic'
import { NetworkTelemetry } from '@/components/landing/NetworkTelemetry'
import { MascotShowcase } from '@/components/landing/MascotShowcase'
import { GhostIcon } from '@/components/shared/GhostIcon'
import { ManifestoSection } from '@/components/landing/ManifestoSection'
import { ArchitectureLayers } from '@/components/landing/ArchitectureLayers'
import { CostComparison } from '@/components/landing/CostComparison'
import { IntegrationMarquee } from '@/components/landing/IntegrationMarquee'
import { IdentityBridge } from '@/components/landing/IdentityBridge'

const AgentSwarm3D = dynamic(
  () => import('@/components/landing/3d/AgentSwarm3D').then((mod) => mod.AgentSwarm3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground font-mono text-sm animate-pulse tracking-widest">
        INITIALIZING NEURAL LINK...
      </div>
    ),
  }
)

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
      {/* 1. Hero Section */}
      <Hero />

      {/* 2. Manifesto - High Impact Brand Statement */}
      <ManifestoSection />

      {/* 1.5 Integration Marquee */}
      <IntegrationMarquee />

      {/* 3. Live Telemetry - Proof of Performance */}
      <section className="relative py-12 sm:py-16 md:py-24 border-b border-border">
        <NetworkTelemetry />
      </section>

      {/* 3. The Mascot Showcase - Brand Soul */}
      <MascotShowcase />

      {/* 4. Architecture Deep Dive */}
      <ArchitectureLayers />

      {/* 5. Cost Efficiency */}
      <CostComparison />

      {/* 5.5 Cross-Chain Identity Bridge */}
      <IdentityBridge />

      {/* 6. Protocol Visualization - The x402 Layer */}
      <section className="py-16 sm:py-24 md:py-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 mb-10 sm:mb-16 md:mb-20 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-3 sm:space-y-4"
          >
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter">
              Pay AI, <span className="text-primary">Get Results.</span>
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto font-light px-2">
              Discover agents, pay per call, funds held in escrow. The only x402 marketplace with
              on-chain trust and dispute resolution.
            </p>
          </motion.div>
        </div>

        <div className="w-full h-[400px] sm:h-[600px] md:h-[800px] border border-border rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl bg-card/40 backdrop-blur-sm relative mx-auto max-w-7xl">
          <div className="absolute inset-0 bg-radial-gradient from-primary/5 via-transparent to-transparent opacity-50 z-0" />
          <div className="relative z-10 w-full h-full">
            <AgentSwarm3D />
          </div>
        </div>

        {/* Floating background elements */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[150px] -z-10" />
      </section>

      {/* 5. Features Grid (Bento) */}
      <section className="py-16 sm:py-24 md:py-32 relative border-t border-border">
        <div className="max-w-7xl mx-auto px-4 mb-10 sm:mb-16 md:mb-20 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight">
            Why <span className="text-primary italic">GhostSpeak</span> vs PayAI?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mt-3 sm:mt-4 px-2">
            PayAI is a payment pipe. GhostSpeak is a marketplace with protection.
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
              <GhostIcon variant="logo" size={40} className="text-primary-foreground hidden sm:block" />
            </div>
            <span className="font-black text-2xl sm:text-3xl tracking-tighter">GhostSpeak</span>
          </div>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 text-xs sm:text-sm text-muted-foreground font-mono">
            <a href="/dashboard" className="hover:text-primary transition-colors">
              PROTOCOL
            </a>
            <a href="/x402/discover" className="hover:text-primary transition-colors">
              DISCOVER
            </a>
            <a href="/dashboard/marketplace" className="hover:text-primary transition-colors">
              MARKETPLACE
            </a>
            <a href="/dashboard/governance" className="hover:text-primary transition-colors">
              GOVERNANCE
            </a>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 text-[10px] sm:text-xs text-muted-foreground/60">
            <a href="/terms" className="hover:text-muted-foreground transition-colors">
              Terms of Service
            </a>
            <span className="text-border hidden sm:inline">•</span>
            <a href="/privacy" className="hover:text-muted-foreground transition-colors">
              Privacy Policy
            </a>
            <span className="text-border hidden sm:inline">•</span>
            <a href="/cookies" className="hover:text-muted-foreground transition-colors">
              Cookie Policy
            </a>
            <span className="text-border hidden sm:inline">•</span>
            <a
              href="mailto:team@ghostspeak.io"
              className="hover:text-muted-foreground transition-colors"
            >
              team@ghostspeak.io
            </a>
          </div>

          <div className="text-[9px] sm:text-[10px] text-muted-foreground/60 font-mono tracking-widest uppercase">
            &copy; 2025 GhostSpeak Labs • Secured by Solana
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
