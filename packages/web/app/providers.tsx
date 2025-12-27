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
import { AuthQuerySyncProvider } from '@/lib/hooks/useAuthQuerySync'
import { ConvexClientProvider } from '@/components/providers/ConvexClientProvider'

const WalletContextProvider = dynamic(
  () => import('@/components/wallet/WalletProvider').then((mod) => mod.WalletContextProvider),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center animate-pulse">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-muted-foreground text-sm font-mono animate-pulse">
            Initializing Protocol...
          </p>
        </div>
      </div>
    ),
  }
)

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Reduce stale time for more real-time feel
        staleTime: 5 * 1000, // 5 seconds
        // Add retry configuration
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error instanceof Error && error.message.includes('4')) {
            return false
          }
          return failureCount < 3
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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

  // Cleanup subscriptions on unmount
  React.useEffect(() => {
    return () => {
      // Cancel all queries and clear cache on unmount
      queryClient.cancelQueries()
      queryClient.clear()
    }
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryStreamedHydration>
        <ConvexClientProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <WalletContextProvider>
              <AuthQuerySyncProvider>
                <GhostSpeakProvider network="devnet">{props.children}</GhostSpeakProvider>
              </AuthQuerySyncProvider>
            </WalletContextProvider>
          </ThemeProvider>
        </ConvexClientProvider>
      </ReactQueryStreamedHydration>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

