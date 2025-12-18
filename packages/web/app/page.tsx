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

const AgentSwarm3D = dynamic(
  () => import('@/components/landing/3d/AgentSwarm3D').then((mod) => mod.AgentSwarm3D),
  { ssr: false }
)

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
      {/* 1. Hero Section */}
      <Hero />

      {/* 2. Manifesto - High Impact Brand Statement */}
      <ManifestoSection />

      {/* 3. Live Telemetry - Proof of Performance */}
      <section className="relative py-24 border-b border-border">
        <NetworkTelemetry />
      </section>

      {/* 3. The Mascot Showcase - Brand Soul */}
      <MascotShowcase />

      {/* 4. Architecture Deep Dive */}
      <ArchitectureLayers />

      {/* 5. Cost Efficiency */}
      <CostComparison />

      {/* 6. Protocol Visualization - The x402 Layer */}
      <section className="py-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 mb-20 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter">
              AI Agents, <span className="text-primary">Settled Instantly.</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg font-light">
              Observe the x402 protocol in action. Autonomous entities discovering and transacting on a unified decentralized backbone.
            </p>
          </motion.div>
        </div>
        
        <div className="w-full h-[800px] border border-border rounded-3xl overflow-hidden shadow-2xl bg-card/40 backdrop-blur-sm relative">
          <div className="absolute inset-0 bg-radial-gradient from-primary/5 via-transparent to-transparent opacity-50 z-0" />
          <div className="relative z-10 w-full h-full">
             <AgentSwarm3D />
          </div>
        </div>

        {/* Floating background elements */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[150px] -z-10" />
      </section>

      {/* 5. Features Grid (Bento) */}
      <section className="py-32 relative border-t border-border">
        <div className="max-w-7xl mx-auto px-4 mb-20 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Built for the <span className="text-primary italic">Machine Economy</span>
          </h2>
        </div>
        <BentoGrid />
      </section>

      {/* 6. Footer */}
      <footer className="py-24 border-t border-border bg-card/80 relative">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center rotate-3 hover:rotate-0 transition-transform cursor-pointer shadow-[0_0_30px_rgba(204,255,0,0.3)]">
               <GhostIcon variant="logo" size={40} className="text-primary-foreground" />
            </div>
            <span className="font-black text-3xl tracking-tighter">GhostSpeak</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 md:gap-8 text-sm text-muted-foreground font-mono">
            <a href="/docs" className="hover:text-primary transition-colors">DOCS</a>
            <a href="/tokenomics" className="hover:text-primary transition-colors">$GHOST</a>
            <a href="/x402/discover" className="hover:text-primary transition-colors">DISCOVER</a>
            <a href="/dashboard" className="hover:text-primary transition-colors">DASHBOARD</a>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <a 
              href="https://x.com/ghostspeak_io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border hover:border-primary/30 hover:bg-primary/10 transition-all text-sm text-muted-foreground hover:text-primary"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              @ghostspeak_io
            </a>
            <a 
              href="https://x.com/i/communities/2001702151752683683" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border hover:border-primary/30 hover:bg-primary/10 transition-all text-sm text-muted-foreground hover:text-primary"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              X Community
            </a>
            <a 
              href="https://github.com/Ghostspeak/GhostSpeak" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border hover:border-primary/30 hover:bg-primary/10 transition-all text-sm text-muted-foreground hover:text-primary"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              GitHub
            </a>
            <a 
              href="https://t.me/GhostSpeakAI" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border hover:border-primary/30 hover:bg-primary/10 transition-all text-sm text-muted-foreground hover:text-primary"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              Telegram
            </a>
          </div>

          <div className="text-[10px] text-muted-foreground/60 font-mono tracking-widest uppercase">
            &copy; 2025 GhostSpeak Labs • Secured by Solana
          </div>
        </div>
        
        {/* Final Status Indicator */}
        <div className="mt-12 flex justify-center items-center gap-3 text-[10px] font-mono">
            <span className="text-primary animate-pulse italic">NETWORK_STATUS: OPERATIONAL</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="text-muted-foreground/40">FINALITY: &lt; 400ms</span>
        </div>
      </footer>
    </div>
  )
}