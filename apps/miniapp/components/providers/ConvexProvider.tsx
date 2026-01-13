'use client'

import { ConvexProvider as BaseConvexProvider } from 'convex/react'
import { ConvexReactClient } from 'convex/react'
import { ReactNode, useMemo } from 'react'

export function ConvexProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!convexUrl) {
      console.warn('NEXT_PUBLIC_CONVEX_URL not set, using default')
      return new ConvexReactClient('https://lovely-cobra-639.convex.cloud')
    }
    return new ConvexReactClient(convexUrl)
  }, [])

  return <BaseConvexProvider client={client}>{children}</BaseConvexProvider>
}
