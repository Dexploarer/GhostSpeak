'use client'

import { ConvexProvider as BaseConvexProvider } from 'convex/react'
import { ConvexReactClient } from 'convex/react'
import { ReactNode, useMemo } from 'react'
import { env, isDevelopment } from '@/lib/env'

export function ConvexProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    const convexUrl = env.NEXT_PUBLIC_CONVEX_URL

    // Log in development only
    if (isDevelopment) {
      console.log('[ConvexProvider] Connecting to:', convexUrl)
      console.log('[ConvexProvider] Environment:', {
        app: env.NEXT_PUBLIC_APP_URL,
        network: env.NEXT_PUBLIC_SOLANA_NETWORK,
      })
    }

    return new ConvexReactClient(convexUrl)
  }, [])

  return <BaseConvexProvider client={client}>{children}</BaseConvexProvider>
}
