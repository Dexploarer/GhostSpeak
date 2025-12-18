'use client'

import {
  isServer,
  QueryClient,
  QueryClientProvider,
  defaultShouldDehydrateQuery,
} from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ReactQueryStreamedHydration } from '@tanstack/react-query-next-experimental'
import { ThemeProvider } from '@/components/theme-provider'
import * as React from 'react'
import dynamic from 'next/dynamic'
import { GhostSpeakProvider } from '@/lib/hooks/useGhostSpeak'

const WalletContextProvider = dynamic(
  () => import('@/components/wallet/WalletProvider').then((mod) => mod.WalletContextProvider),
  { ssr: false }
)

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Reduce stale time for more real-time feel
        staleTime: 5 * 1000, // 5 seconds
        // Add retry configuration - more resilient for initial load
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
        // Cleanup configuration
        gcTime: 5 * 60 * 1000, // 5 minutes (was cacheTime)
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        // Global mutation configuration
        retry: 1,
        onError: (error) => {
          console.error('Mutation error:', error)
        },
      },
      dehydrate: {
        // include pending queries in dehydration
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
        shouldRedactErrors: () => false,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

export function Providers(props: { children: React.ReactNode }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient()

  // Note: Removed cleanup effect that was canceling queries on unmount.
  // This was causing "Query Failed" errors on initial load because React 18
  // strict mode and hydration can cause mount/unmount cycles.
  // React Query handles its own cleanup via gcTime (garbage collection).

  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryStreamedHydration>
        <ThemeProvider>
          <WalletContextProvider>
            <GhostSpeakProvider network="devnet">
              {props.children}
            </GhostSpeakProvider>
          </WalletContextProvider>
        </ThemeProvider>
      </ReactQueryStreamedHydration>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
