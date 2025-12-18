'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import { DocsSidebar } from './DocsSidebar'
import { DocsTableOfContents } from './DocsTableOfContents'
import { DocsPager } from './DocsPager'
import { DocsBreadcrumbs } from './DocsBreadcrumbs'
import { OpenInChat } from './OpenInChat'
import { Menu, X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { docsConfig } from '@/config/docs'

export function DocsLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()
  
  // Get the current doc title for the query
  const section = docsConfig.find(s => s.items.some(i => i.href === pathname))
  const item = section?.items.find(i => i.href === pathname)
  const docTitle = item?.title ?? 'GhostSpeak'
  const query = `Help me understand the GhostSpeak ${docTitle} documentation. GhostSpeak is a Solana-native x402 payment protocol for AI agent commerce.`

  return (
    <div className="flex min-h-screen bg-background pt-16">
      {/* Mobile Docs Header */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-20 h-12 border-b border-border bg-background/80 backdrop-blur-md px-4 flex items-center justify-between">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="flex items-center gap-2 text-sm font-bold text-primary"
        >
          <Menu className="w-4 h-4" />
          Docs Menu
        </button>
        <div className="flex items-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          GhostSpeak v2.3 <ChevronRight className="w-3 h-3 ml-1" />
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] bg-background border-r border-border md:hidden overflow-y-auto"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <span className="font-bold text-lg">Documentation</span>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 rounded-full hover:bg-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4" onClick={() => setIsSidebarOpen(false)}>
                <DocsSidebar isMobile />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="hidden md:block">
        <DocsSidebar />
      </div>
      
      <main className={cn(
        "flex-1 md:pl-64 xl:pr-64 transition-all",
        "pt-12 md:pt-0" // Add padding for mobile header
      )}>
        <div className="mx-auto max-w-4xl px-4 py-8 md:py-12 md:px-8 lg:py-16">
          <div className="flex items-center justify-between mb-8">
            <DocsBreadcrumbs />
            <OpenInChat query={query} />
          </div>
          
          <article className="prose prose-slate dark:prose-invert max-w-none min-h-[60vh]">
            {children}
          </article>
          
          <DocsPager />
          
          <div className="mt-16 border-t border-border pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
              <p>© 2025 GhostSpeak Protocol. Built for the machine economy.</p>
              <div className="flex gap-6">
                <a href="https://x.com/ghostspeak_io" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Twitter/X</a>
                <a href="https://x.com/i/communities/2001702151752683683" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Community</a>
                <a href="https://github.com/Ghostspeak/GhostSpeak" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">GitHub</a>
                <a href="https://t.me/GhostSpeakAI" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Telegram</a>
              </div>
            </div>
          </div>
        </div>
      </main>

      <DocsTableOfContents />
    </div>
  )
}
