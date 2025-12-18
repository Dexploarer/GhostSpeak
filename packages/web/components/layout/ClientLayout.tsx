'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { Providers } from '@/app/providers'
import { Toaster } from '@/components/ui/toaster'

// Dynamically import Navigation to prevent issues with its dependencies
const Navigation = dynamic(
  () => import('./Navigation').then((mod) => mod.Navigation),
  { 
    ssr: false,
    loading: () => (
      <nav className="h-16 border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl" />
    )
  }
)

// Dynamically import error boundary
const GhostSpeakErrorBoundary = dynamic(
  () => import('@/components/error-boundaries').then((mod) => mod.GhostSpeakErrorBoundary),
  { ssr: false }
)

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <Providers>
      <GhostSpeakErrorBoundary level="page">
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-1">{children}</main>
        </div>
      </GhostSpeakErrorBoundary>
      <Toaster />
    </Providers>
  )
}
