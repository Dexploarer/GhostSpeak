'use client'

import { ThemeProvider } from '@/components/theme-provider'
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider'
import { WalletContextProvider } from '@/components/wallet/WalletProvider'
import { AuthSyncEngine } from '@/lib/auth/sync-engine'
import { ConvexProviderWithAuth } from 'convex/react'
import { ConvexReactClient } from 'convex/react'
import { useConvexAuthFromCrossmint } from '@/lib/hooks/useConvexAuth'
import { QueryClient, QueryClientProvider, isServer } from '@tanstack/react-query'
import * as React from 'react'

// Create Convex client singleton
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * Create a new QueryClient instance
 *
 * This factory function is used to create QueryClient instances with consistent configuration.
 * On the server, a new instance is created per request to prevent data leakage.
 * On the client, a singleton instance is reused across renders.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  })
}

/**
 * Browser QueryClient singleton
 *
 * This is only used on the client-side to maintain a single QueryClient instance
 * across renders for optimal performance and state management.
 */
let browserQueryClient: QueryClient | undefined = undefined

/**
 * Get QueryClient instance
 *
 * Server: Creates a new QueryClient per request (prevents data leakage between users)
 * Client: Reuses a singleton QueryClient (maintains cache across renders)
 */
function getQueryClient() {
  if (isServer) {
    // Always create a new QueryClient on the server
    return makeQueryClient()
  } else {
    // Create the QueryClient once on the client and reuse it
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient()
    }
    return browserQueryClient
  }
}

/**
 * Convex Auth Wrapper
 *
 * This wrapper component uses the Crossmint → Convex auth bridge hook
 * and provides it to ConvexProviderWithAuth
 */
function ConvexAuthWrapper({ children }: { children: React.ReactNode }) {
  const convexAuth = useConvexAuthFromCrossmint()

  return (
    <ConvexProviderWithAuth client={convex} useAuth={() => convexAuth}>
      {children}
    </ConvexProviderWithAuth>
  )
}

/**
 * Root Providers Component
 *
 * Provider hierarchy:
 * 1. ThemeProvider (dark/light mode)
 * 2. SmoothScrollProvider (Lenis smooth scrolling)
 * 3. QueryClientProvider (TanStack Query for data fetching)
 * 4. WalletContextProvider (Crossmint auth + wallet)
 * 5. ConvexAuthWrapper (Convex backend with Crossmint JWT)
 * 6. AuthSyncEngine (syncs Crossmint → Zustand → Convex → TanStack Query)
 */
export function Providers(props: { children: React.ReactNode }) {
  // Use the SSR-safe QueryClient getter
  const queryClient = getQueryClient()

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SmoothScrollProvider>
        {/* TanStack Query for data fetching and caching */}
        <QueryClientProvider client={queryClient}>
          {/* Crossmint Auth + Wallet Provider */}
          <WalletContextProvider>
            {/* Convex Backend with Crossmint JWT Authentication */}
            <ConvexAuthWrapper>
              {/* Auth Sync Engine (Crossmint → Zustand → Convex → TanStack Query) */}
              <AuthSyncEngine>{props.children}</AuthSyncEngine>
            </ConvexAuthWrapper>
          </WalletContextProvider>
        </QueryClientProvider>
      </SmoothScrollProvider>
    </ThemeProvider>
  )
}
