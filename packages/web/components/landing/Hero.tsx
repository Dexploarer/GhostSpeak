'use client'

import { ArrowRight, PlayCircle, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { CodePreview } from './CodePreview'
import { LiveTicker } from './LiveTicker'
import { GhostIcon } from '../shared/GhostIcon'
import { StatusLabel } from '../shared/StatusLabel'

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const y1 = useTransform(scrollY, [0, 500], [0, 150])
  const y2 = useTransform(scrollY, [0, 500], [0, -100])
  
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div 
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative min-h-[110vh] flex flex-col justify-center overflow-hidden bg-background selection:bg-primary/30"
    >
      {/* 1. Underlying Holographic Grid (Revealed by Spotlight) */}
      <div 
        className="absolute inset-0 holographic-grid transition-opacity duration-1000"
        style={{
          opacity: isHovered ? 0.15 : 0.05,
          maskImage: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, black, transparent)`
        }}
      />

      {/* 2. Scanline Overlay */}
      <div className="scanline" />

      {/* 3. Floating Beams */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         {[...Array(5)].map((_, i) => (
           <div 
             key={i} 
             className="beam shadow-[0_0_15px_rgba(204,255,0,0.3)]" 
             style={{ 
               left: `${i * 20 + 10}%`, 
               animationDelay: `${i * 2}s`,
               opacity: 0.1
             }} 
           />
         ))}
      </div>

      {/* 4. Interactive Spotlight (Glow) */}
      <div 
        className="pointer-events-none absolute inset-0 transition-opacity duration-700 opacity-40 mix-blend-screen"
        style={{
          background: `radial-gradient(1000px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(204, 255, 0, 0.08), transparent 50%)`,
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-32 pb-24 lg:pt-48 z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Text Content */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="text-center lg:text-left space-y-8 md:space-y-10"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] text-primary backdrop-blur-3xl shadow-[0_0_20px_rgba(204,255,0,0.1)]"
            >
              <span className="flex h-1.5 w-1.5 rounded-full bg-primary mr-2 animate-ping" />
              Infrastructure Layer v1.0.4-Stable
            </motion.div>

            <div className="space-y-4">
              <h1 className="text-5xl sm:text-7xl lg:text-9xl font-black tracking-tighter text-foreground leading-[0.9] md:leading-[0.85]">
                The Silent <br />
                <span className="text-primary italic relative">
                  Engine
                  <motion.span 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ delay: 1, duration: 1 }}
                    className="absolute -bottom-2 left-0 h-2 bg-primary/30 blur-[2px]"
                  />
                </span>
                <br />
                of AI
              </h1>
            </div>

            <p className="text-lg md:text-2xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light">
              GhostSpeak provides the <span className="text-foreground font-medium">high-performance settlement layer</span> for autonomous agent clusters. Sub-second x402 payments. Bulletproof security.
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-4 md:gap-6 pt-4">
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-14 md:h-16 px-10 rounded-xl text-base md:text-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(204,255,0,0.2)]">
                  Access Protocol <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/docs" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full h-14 md:h-16 px-10 rounded-xl text-base md:text-lg border-border text-foreground hover:bg-muted transition-all">
                  Documentation
                </Button>
              </Link>
            </div>

            {/* Social Links */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-4">
              <a 
                href="https://x.com/ghostspeak_io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-sm text-muted-foreground hover:text-foreground"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Twitter/X
              </a>
              <a 
                href="https://x.com/i/communities/2001702151752683683" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-sm text-muted-foreground hover:text-foreground"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Community
              </a>
              <a 
                href="https://github.com/Ghostspeak/GhostSpeak" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-sm text-muted-foreground hover:text-foreground"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                GitHub
              </a>
              <a 
                href="https://t.me/GhostSpeakAI" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-sm text-muted-foreground hover:text-foreground"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                Telegram
              </a>
            </div>

            <div className="pt-8 md:pt-12 grid grid-cols-3 gap-4 md:gap-8 border-t border-border">
              {[
                { label: 'Latency', val: '42ms' },
                { label: 'Settlement', val: 'x402' },
                { label: 'Cost', val: '0.0001' },
              ].map((stat, i) => (
                <div key={stat.label} className="flex flex-col items-center lg:items-start scale-90 md:scale-100">
                  <StatusLabel 
                    label={stat.label}
                    value={stat.val}
                    variant="white"
                    animate
                  />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Graphic Content - Parallax & 3D Effect */}
          <motion.div 
            style={{ y: y1 }}
            className="relative hidden lg:block perspective-2000"
          >
             {/* Deep Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] animate-pulse" />
            
            <motion.div 
              style={{ rotateY: -12, rotateX: 6 }}
              whileHover={{ rotateY: -5, rotateX: 2, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 40, damping: 20 }}
              className="relative z-10"
            >
              {/* Main Terminal Frame */}
              <div className="rounded-2xl p-px bg-linear-to-br from-foreground/20 via-foreground/5 to-transparent backdrop-blur-3xl shadow-2xl overflow-hidden group">
                 <div className="rounded-2xl overflow-hidden bg-background/90 relative p-2 border border-border">
                    {/* Header bar */}
                    <div className="h-8 flex items-center px-4 gap-1.5 border-b border-border mb-2">
                       <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                       <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
                       <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                       <div className="ml-auto text-[10px] font-mono text-muted-foreground select-none">root@ghostspeak:~/protocol</div>
                    </div>
                    
                    <CodePreview />
                    
                    <div className="absolute top-8 right-8 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity duration-1000">
                       <GhostIcon variant="circuit" size={120} className="text-primary/20 animate-float" />
                    </div>
                 </div>
              </div>
              
              {/* Floating Status Card Overlay */}
              <motion.div 
                style={{ y: y2 }}
                className="absolute -right-20 top-1/4 bg-background/80 p-6 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.1)] border border-border w-80 animate-float backdrop-blur-2xl group"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center relative border border-primary/20">
                    <div className="absolute inset-0 bg-primary/20 rounded-xl animate-ping opacity-20" />
                    <GhostIcon variant="logo" size={32} className="text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-foreground tracking-tight group-hover:text-primary transition-colors">AGENT_042_READY</div>
                    <div className="text-[10px] text-primary/50 font-mono">ENCRYPTED_SIGNAL_LOCK</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-mono">
                     <span className="text-muted-foreground">PAYMENT_HEX</span>
                     <span className="text-primary truncate ml-4 italic">0x402_AUTH_OK</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: "100%" }}
                       transition={{ duration: 3, repeat: Infinity }}
                       className="h-full bg-primary"
                     />
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                     {['G', 'H', 'O', 'S', 'T'].map((letter, i) => (
                       <motion.div 
                         key={i}
                         initial={{ backgroundColor: 'transparent', borderColor: 'var(--border)' }}
                         animate={{ 
                           backgroundColor: ['transparent', 'transparent', 'var(--color-primary-10)', 'var(--color-primary-10)', 'transparent'],
                           borderColor: ['var(--border)', 'var(--border)', 'var(--color-primary-30)', 'var(--color-primary-30)', 'var(--border)']
                         }}
                         transition={{ 
                           duration: 3, 
                           times: [0, 0.05 + (i * 0.15), 0.15 + (i * 0.15), 0.9, 1],
                           repeat: Infinity,
                           repeatDelay: 0,
                           ease: "easeInOut"
                         }}
                         className="flex-1 h-12 rounded-lg flex items-center justify-center font-black text-xl border transition-colors"
                       >
                         <motion.span
                            animate={{ opacity: [0, 0, 1, 1, 0] }}
                            transition={{ 
                                duration: 3,
                                times: [0, 0.05 + (i * 0.15), 0.15 + (i * 0.15), 0.9, 1],
                                repeat: Infinity,
                                repeatDelay: 0
                            }}
                            className="text-primary"
                         >
                           {letter}
                         </motion.span>
                       </motion.div>
                     ))}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[200px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[180px] -z-10 pointer-events-none" />

      {/* Bottom Ticker */}
      <div className="absolute bottom-0 left-0 right-0 z-30 border-t border-border bg-background/60 backdrop-blur-md">
        <LiveTicker />
      </div>

      <style jsx>{`
        .perspective-2000 {
          perspective: 2000px;
        }
      `}</style>
    </div>
  )
}
