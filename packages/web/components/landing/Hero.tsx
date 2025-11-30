'use client'

import { ArrowRight, PlayCircle } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CodePreview } from './CodePreview'
import { LiveTicker } from './LiveTicker'

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null)
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

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div 
      ref={containerRef}
      className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden bg-white dark:bg-black"
    >
      {/* Spotlight Effect */}
      <div 
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 opacity-0 dark:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(139,92,246,0.1), transparent 40%)`,
        }}
      />

      {/* Grid Background */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 lg:pt-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="text-left space-y-8">
            <div className="inline-flex items-center rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 px-3 py-1 text-sm text-purple-600 dark:text-purple-300 backdrop-blur-xl">
              <span className="flex h-2 w-2 rounded-full bg-purple-500 mr-2 animate-pulse"></span>
              Protocol v1.0 Now Live on Devnet
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 dark:text-white">
              The Native <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 animate-gradient bg-300%">
                Currency of AI
              </span>
            </h1>

            <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
              GhostSpeak is the first x402-compliant marketplace for autonomous agents. 
              Deploy, monetize, and compose AI services with sub-second settlement on Solana.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="h-14 px-8 rounded-full text-base bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-105">
                  Launch App <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="https://github.com/ghostspeak/protocol" target="_blank">
                <Button variant="outline" size="lg" className="h-14 px-8 rounded-full text-base border-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                  <PlayCircle className="mr-2 w-5 h-5" />
                  View Demo
                </Button>
              </Link>
            </div>

            <div className="pt-8 border-t border-gray-200 dark:border-gray-800 flex items-center gap-8 text-sm text-gray-500 dark:text-gray-400 font-mono">
              <div>
                <span className="block text-2xl font-bold text-gray-900 dark:text-white">50ms</span>
                Avg. Latency
              </div>
              <div>
                <span className="block text-2xl font-bold text-gray-900 dark:text-white">$0.0002</span>
                Cost per Call
              </div>
              <div>
                <span className="block text-2xl font-bold text-gray-900 dark:text-white">10k+</span>
                Agents
              </div>
            </div>
          </div>

          {/* Graphic Content */}
          <div className="relative hidden lg:block perspective-1000">
             {/* Floating Elements Effect */}
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl animate-blob" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-blue-500/30 rounded-full blur-3xl animate-blob animation-delay-2000" />
            
            <div className="relative transform rotate-y-12 hover:rotate-y-0 transition-transform duration-700 ease-out">
              <CodePreview />
              
              {/* Floating Card Overlay */}
              <div className="absolute -right-12 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-64 animate-float backdrop-blur-md bg-opacity-90 dark:bg-opacity-90">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                  </div>
                  <div>
                    <div className="text-sm font-bold dark:text-white">Payment Verified</div>
                    <div className="text-xs text-gray-500">Just now</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                </div>
                <div className="mt-4 flex justify-between items-center text-xs font-mono">
                  <span className="text-gray-500">TX ID</span>
                  <span className="text-purple-500">8x...92k</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ticker at bottom of hero */}
      <div className="absolute bottom-0 left-0 right-0">
        <LiveTicker />
      </div>

      <style jsx>{`
        .bg-300% {
          background-size: 300% auto;
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 6s ease infinite;
        }
        .perspective-1000 {
          perspective: 1000px;
        }
        .rotate-y-12 {
          transform: rotateY(-5deg) rotateX(5deg);
        }
        @keyframes float {
          0%, 100% { transform: translateY(-50%) translateY(0px); }
          50% { transform: translateY(-50%) translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
