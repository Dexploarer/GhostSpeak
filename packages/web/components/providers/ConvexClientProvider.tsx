'use client'

import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react'
import { ReactNode, useMemo } from 'react'
import { useAuthStore } from '@/lib/stores/auth.store'

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * Convex Client Provider with Zustand Auth Integration
 *
 * Provides JWT tokens from Zustand store to Convex for authentication
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  // Get auth state from Zustand store
  const jwt = useAuthStore((state) => state.jwt)
  const status = useAuthStore((state) => state.status)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const authState = useMemo(() => {
    return {
      isLoading: status === 'initializing' || status === 'authenticating',
      isAuthenticated,
      fetchAccessToken: async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
        // Get latest JWT from store
        const currentJWT = useAuthStore.getState().jwt

        if (forceRefreshToken) {
          // Token refresh is handled by Crossmint SDK and synced to Zustand
          // Just return the current token (Crossmint auto-refreshes)
          console.log('[Convex] Force refresh requested - returning current JWT')
          return currentJWT ?? null
        }

        return currentJWT ?? null
      },
    }
  }, [jwt, status, isAuthenticated])

  return (
    <ConvexProviderWithAuth client={convex} useAuth={() => authState}>
      {children}
    </ConvexProviderWithAuth>
  )
}
