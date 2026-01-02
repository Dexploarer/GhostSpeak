/**
 * Convex Auth Bridge Hook
 *
 * Bridges Crossmint authentication to Convex's ConvexProviderWithAuth format.
 *
 * Crossmint provides: { status, jwt, user }
 * Convex expects: { isLoading, isAuthenticated, fetchAccessToken }
 */

'use client'

import { useCallback, useMemo } from 'react'
import { useAuth as useCrossmintAuth } from '@crossmint/client-sdk-react-ui'

/**
 * Custom hook that adapts Crossmint auth to Convex's auth interface
 */
export function useConvexAuthFromCrossmint() {
  const { status, jwt } = useCrossmintAuth()

  /**
   * Fetch the current JWT access token
   *
   * Convex calls this function to get the JWT for authenticated requests
   */
  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken?: boolean }) => {
      // If forcing refresh, Crossmint SDK handles it automatically
      if (forceRefreshToken) {
        console.log('[Convex Auth] Token refresh requested')
      }

      if (!jwt) {
        console.warn('[Convex Auth] No JWT available from Crossmint')
        return null
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[Convex Auth] Providing JWT to Convex:', jwt.substring(0, 20) + '...')
      }

      return jwt
    },
    [jwt]
  )

  // Map Crossmint status to Convex's expected format
  return useMemo(
    () => ({
      // Convex is loading when Crossmint is initializing
      isLoading: status === 'in-progress',

      // User is authenticated when Crossmint is logged in AND has a JWT
      isAuthenticated: status === 'logged-in' && !!jwt,

      // Function to fetch the JWT token
      fetchAccessToken,
    }),
    [status, jwt, fetchAccessToken]
  )
}
