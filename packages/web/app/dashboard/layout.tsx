'use client'

import React from 'react'
import { DashboardSidebar } from '@/components/dashboard/layout/Sidebar'
import { GhostSpeakErrorBoundary } from '@/components/error-boundaries/GhostSpeakErrorBoundary'
import { NetworkIndicator } from '@/components/ui/network-indicator'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[30%] rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] dark:invert" />
      </div>

      <div className="relative z-10 flex">
        <DashboardSidebar />
        <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
          {/* Network Indicator */}
          <div className="flex justify-end mb-4">
            <NetworkIndicator />
          </div>
          
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <GhostSpeakErrorBoundary level="page">
              {children}
            </GhostSpeakErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}
