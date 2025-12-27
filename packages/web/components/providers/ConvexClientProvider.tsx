'use client'

import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react'
import { ReactNode, useMemo } from 'react'
import { useAuth } from '@crossmint/client-sdk-react-ui'

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const { jwt, status } = useAuth()

  const authState = useMemo(() => {
    return {
      isLoading: status !== 'logged-in' && status !== 'logged-out',
      isAuthenticated: status === 'logged-in',
      fetchAccessToken: async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
        if (forceRefreshToken) {
          // Crossmint handles refresh automatically, but we can return the current jwt
          return jwt ?? null
        }
        return jwt ?? null
      },
    }
  }, [jwt, status])

  return (
    <ConvexProviderWithAuth client={convex} useAuth={() => authState}>
      {children}
    </ConvexProviderWithAuth>
  )
}
