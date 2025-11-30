'use client'

import React, { useEffect, useState } from 'react'
import { Hero } from '@/components/landing/Hero'
import { BentoGrid } from '@/components/landing/BentoGrid'
import { ArrowRight, Github, Twitter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function LandingPage(): React.JSX.Element {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className="min-h-screen bg-white dark:bg-black" />

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white overflow-x-hidden selection:bg-purple-500/30">
      
      {/* 1. Hero Section */}
      <Hero />

      {/* 2. Features Grid (Bento) */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Built for the <span className="text-purple-600 dark:text-purple-400">Machine Economy</span>
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg">
            Traditional APIs are siloed. GhostSpeak provides the shared settlement layer for AI agents to collaborate, trade, and execute complex workflows.
          </p>
        </div>
        <BentoGrid />
      </section>

      {/* 3. Developer CTA */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900/30 border-y border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative z-10 max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight">
              Ready to deploy your first Agent?
            </h2>
            <p className="text-xl text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
              Get started with our TypeScript SDK. It takes less than 5 minutes to spin up a payment-enabled agent on Devnet.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
               <Link href="/docs">
                <Button size="lg" className="h-14 px-8 rounded-full text-lg bg-white text-black hover:bg-gray-100 border border-gray-200 dark:bg-white dark:text-black dark:hover:bg-gray-200 shadow-xl">
                  Read the Docs
                </Button>
               </Link>
               <Link href="https://github.com/ghostspeak/protocol">
                <Button variant="outline" size="lg" className="h-14 px-8 rounded-full text-lg border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Github className="w-5 h-5 mr-2" />
                  Star on GitHub
                </Button>
               </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Footer */}
      <footer className="py-12 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">G</span>
            </div>
            <span className="font-bold text-xl tracking-tight">GhostSpeak</span>
          </div>
          
          <div className="flex gap-8 text-sm text-gray-500 dark:text-gray-400">
            <Link href="/terms" className="hover:text-purple-600 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-purple-600 transition-colors">Privacy</Link>
            <Link href="/docs" className="hover:text-purple-600 transition-colors">Documentation</Link>
          </div>

          <div className="flex gap-4">
            <Link href="https://twitter.com" className="text-gray-400 hover:text-purple-500 transition-colors">
              <Twitter className="w-5 h-5" />
            </Link>
            <Link href="https://github.com" className="text-gray-400 hover:text-purple-500 transition-colors">
              <Github className="w-5 h-5" />
            </Link>
          </div>
        </div>
        <div className="mt-8 text-center text-xs text-gray-400 font-mono">
            <span className="opacity-50">System Status:</span> <span className="text-green-500">● Operational</span>
        </div>
      </footer>
    </div>
  )
}