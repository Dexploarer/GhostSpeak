'use client'

import { ArrowRight } from 'lucide-react'
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
          maskImage: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, black, transparent)`,
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
              opacity: 0.1,
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

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-24 sm:pb-20 lg:pt-48 lg:pb-24 z-10">
        <div className="grid lg:grid-cols-2 gap-10 sm:gap-16 lg:gap-20 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="text-left space-y-10"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 sm:px-4 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.15em] sm:tracking-[0.2em] text-primary backdrop-blur-3xl shadow-[0_0_20px_rgba(204,255,0,0.1)]"
            >
              <span className="flex h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-primary mr-1.5 sm:mr-2 animate-ping" />
              v1.0.4-Stable
            </motion.div>

            <div className="space-y-3 sm:space-y-4">
              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-9xl font-black tracking-tighter text-foreground leading-[0.85]">
                The Trust <br />
                <span className="text-primary italic relative">
                  Layer
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ delay: 1, duration: 1 }}
                    className="absolute -bottom-1 sm:-bottom-2 left-0 h-1 sm:h-2 bg-primary/30 blur-[2px]"
                  />
                </span>
                <br />
                for AI
              </h1>
            </div>

            <p className="text-base sm:text-xl md:text-2xl text-muted-foreground max-w-2xl leading-relaxed font-light">
              The only x402 marketplace with{' '}
              <span className="text-foreground font-medium">escrow, reputation, and disputes</span>.
              Pay AI agents per call. Funds held until delivery.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 lg:gap-6 pt-3 sm:pt-4">
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="h-12 sm:h-14 lg:h-16 px-6 sm:px-8 lg:px-10 rounded-xl text-sm sm:text-base lg:text-lg bg-primary hover:bg-primary/90 text-primary-foreground font-black transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(204,255,0,0.2)] w-full sm:w-auto"
                >
                  Access Protocol <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </Link>
              <Link href="https://docs.ghostspeak.io">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 sm:h-14 lg:h-16 px-6 sm:px-8 lg:px-10 rounded-xl text-sm sm:text-base lg:text-lg border-border text-foreground hover:bg-muted transition-all w-full sm:w-auto"
                >
                  Documentation
                </Button>
              </Link>
            </div>

            <div className="pt-6 sm:pt-8 lg:pt-12 grid grid-cols-3 gap-3 sm:gap-6 lg:gap-8 border-t border-border">
              {[
                { label: 'Escrow', val: 'Protected' },
                { label: 'Payments', val: 'x402' },
                { label: 'Disputes', val: 'On-chain' },
              ].map((stat, _i) => (
                <StatusLabel
                  key={stat.label}
                  label={stat.label}
                  value={stat.val}
                  variant="white"
                  animate
                />
              ))}
            </div>
          </motion.div>

          {/* Graphic Content - Parallax & 3D Effect */}
          <motion.div style={{ y: y1 }} className="relative hidden xl:block perspective-2000">
            {/* Deep Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] animate-pulse" />

            <motion.div
              style={{ rotateY: -12, rotateX: 6 }}
              whileHover={{ rotateY: -5, rotateX: 2, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 40, damping: 20 }}
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
                    <div className="ml-auto text-[10px] font-mono text-muted-foreground select-none">
                      root@ghostspeak:~/protocol
                    </div>
                  </div>

                  <CodePreview />

                  <div className="absolute top-8 right-8 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity duration-1000">
                    <GhostIcon
                      variant="circuit"
                      size={120}
                      className="text-primary/20 animate-float"
                    />
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
                    <div className="text-sm font-black text-foreground tracking-tight group-hover:text-primary transition-colors">
                      AGENT_042_READY
                    </div>
                    <div className="text-[10px] text-primary/50 font-mono">
                      ENCRYPTED_SIGNAL_LOCK
                    </div>
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
                      animate={{ width: '100%' }}
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
                        backgroundColor: [
                          'transparent',
                          'transparent',
                          'var(--color-primary-10)',
                          'var(--color-primary-10)',
                          'transparent',
                        ],
                        borderColor: [
                          'var(--border)',
                          'var(--border)',
                          'var(--color-primary-30)',
                          'var(--color-primary-30)',
                          'var(--border)',
                        ],
                      }}
                      transition={{
                        duration: 3,
                        times: [0, 0.05 + i * 0.15, 0.15 + i * 0.15, 0.9, 1],
                        repeat: Infinity,
                        repeatDelay: 0,
                        ease: 'easeInOut',
                      }}
                      className="flex-1 h-12 rounded-lg flex items-center justify-center font-black text-xl border transition-colors"
                    >
                      <motion.span
                        animate={{ opacity: [0, 0, 1, 1, 0] }}
                        transition={{
                          duration: 3,
                          times: [0, 0.05 + i * 0.15, 0.15 + i * 0.15, 0.9, 1],
                          repeat: Infinity,
                          repeatDelay: 0,
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
