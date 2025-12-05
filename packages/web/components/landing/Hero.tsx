'use client'

import { ArrowRight, PlayCircle } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { easeOut, motion, useScroll, useTransform } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { CodePreview } from './CodePreview'
import { LiveTicker } from './LiveTicker'

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const y1 = useTransform(scrollY, [0, 500], [0, 200])
  const y2 = useTransform(scrollY, [0, 500], [0, -150])
  
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

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

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', handleMouseMove)
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('mousemove', handleMouseMove)
      }
    }
  }, [])

  return (
    <div 
      ref={containerRef}
      className="relative min-h-[100vh] flex flex-col justify-center overflow-hidden bg-background"
    >
      {/* Dynamic Aurora Background */}
      <div className="absolute inset-0 aurora-bg opacity-40 dark:opacity-20 animate-pulse pointer-events-none" />
      
      {/* Interactive Spotlight */}
      <div 
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 opacity-0 dark:opacity-100 mix-blend-screen"
        style={{
          background: `radial-gradient(800px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(124, 58, 237, 0.15), transparent 40%)`,
        }}
      />

      {/* Grid Texture */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 lg:pt-48">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Text Content */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-left space-y-8 z-10"
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center rounded-full border border-purple-200/50 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-950/30 px-4 py-1.5 text-sm font-medium text-purple-600 dark:text-purple-300 backdrop-blur-xl shadow-lg shadow-purple-500/10"
            >
              <span className="flex h-2 w-2 rounded-full bg-purple-500 mr-2 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)]"></span>
              Protocol v1.0 Live on Devnet
            </motion.div>

            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black tracking-tighter text-gray-900 dark:text-white leading-[0.9]">
              The Native<br />
              <span className="text-shimmer relative">
                Currency of AI
                <svg className="absolute -bottom-2 w-full h-3 text-purple-500 opacity-60" viewBox="0 0 100 10" preserveAspectRatio="none">
                   <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed font-light">
              GhostSpeak is the first <span className="font-semibold text-gray-900 dark:text-white">x402-compliant marketplace</span> for autonomous agents. 
              Deploy, monetize, and compose AI services with sub-second settlement on Solana.
            </p>

            <div className="flex flex-wrap gap-5 pt-2">
              <Link href="/dashboard">
                <Button size="lg" className="h-16 px-10 rounded-full text-lg bg-primary hover:bg-primary/90 text-white shadow-xl shadow-purple-500/25 transition-all hover:scale-105 active:scale-95">
                  Launch App <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="https://github.com/ghostspeak/protocol" target="_blank">
                <Button variant="outline" size="lg" className="h-16 px-10 rounded-full text-lg border-2 hover:bg-white/10 dark:hover:bg-white/5 backdrop-blur-sm transition-all hover:border-purple-500/50">
                  <PlayCircle className="mr-2 w-5 h-5" />
                  View Demo
                </Button>
              </Link>
            </div>

            <div className="pt-10 border-t border-gray-200 dark:border-white/10 flex items-center gap-12 text-sm text-gray-500 dark:text-gray-400 font-mono">
              <motion.div whileHover={{ scale: 1.05 }} className="cursor-default">
                <span className="block text-3xl font-bold text-gray-900 dark:text-white tracking-tight">50ms</span>
                Latency
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} className="cursor-default">
                <span className="block text-3xl font-bold text-gray-900 dark:text-white tracking-tight">$0.0002</span>
                Cost/Call
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} className="cursor-default">
                <span className="block text-3xl font-bold text-gray-900 dark:text-white tracking-tight">10k+</span>
                Agents
              </motion.div>
            </div>
          </motion.div>

          {/* Graphic Content - Parallax & 3D */}
          <motion.div 
            style={{ y: y1 }}
            className="relative hidden lg:block perspective-1000"
          >
             {/* Glowing Orbs */}
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] animate-pulse animation-delay-2000" />
            
            <motion.div 
              style={{ rotateY: -10, rotateX: 5 }}
              whileHover={{ rotateY: 0, rotateX: 0, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="relative z-10"
            >
              <div className="rounded-2xl p-1 bg-gradient-to-br from-white/20 to-white/0 dark:from-white/10 dark:to-transparent backdrop-blur-sm border border-white/20 shadow-2xl">
                 <div className="rounded-xl overflow-hidden bg-black/80 backdrop-blur-xl">
                   <CodePreview />
                 </div>
              </div>
              
              {/* Floating Card Overlay */}
              <motion.div 
                style={{ y: y2 }}
                className="absolute -right-16 top-1/3 bg-white/90 dark:bg-gray-900/90 p-5 rounded-2xl shadow-2xl border border-white/20 w-72 animate-float backdrop-blur-xl"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                    <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">Payment Finalized</div>
                    <div className="text-xs text-gray-500 font-mono">block #2491029</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full w-3/4 animate-pulse" />
                  <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full w-1/2 animate-pulse" />
                </div>
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/5 flex justify-between items-center text-xs font-mono">
                  <span className="text-gray-500">TX HASH</span>
                  <span className="text-purple-500 bg-purple-500/10 px-2 py-1 rounded">8x...92k</span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Ticker at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-background/50 backdrop-blur-sm">
        <LiveTicker />
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  )
}
