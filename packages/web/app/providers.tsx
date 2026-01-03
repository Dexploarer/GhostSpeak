'use client'

import { ThemeProvider } from '@/components/theme-provider'
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider'
import { WalletAuthProvider } from '@/components/auth/WalletAuthProvider'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import * as React from 'react'

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * Root Providers Component
 *
 * Provider hierarchy:
 * 1. ThemeProvider (dark/light mode)
 * 2. ConvexProvider (Convex backend)
 * 3. WalletAuthProvider (Solana wallet connection)
 * 4. SmoothScrollProvider (Lenis smooth scrolling)
 */
export function Providers(props: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ConvexProvider client={convex}>
        <WalletAuthProvider>
          <SmoothScrollProvider>{props.children}</SmoothScrollProvider>
        </WalletAuthProvider>
      </ConvexProvider>
    </ThemeProvider>
  )
}
