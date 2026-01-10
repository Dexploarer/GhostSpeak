import type { ReactNode } from 'react'

// Disable static generation for observatory routes
export const dynamic = 'force-dynamic'

export default function ObservatoryLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
