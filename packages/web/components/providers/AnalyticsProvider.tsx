'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { analytics } from '@/lib/analytics'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialize analytics on mount
  useEffect(() => {
    analytics.initialize()
  }, [])

  // Track page views
  useEffect(() => {
    if (pathname) {
      analytics.trackPageView(pathname)
    }
  }, [pathname, searchParams])

  return <>{children}</>
}
