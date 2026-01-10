import type { ReactNode } from 'react'

// Disable static generation for all routes under /agents
export const dynamic = 'force-dynamic'

export default function AgentsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
