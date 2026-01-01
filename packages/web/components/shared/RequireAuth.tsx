'use client'

/**
 * RequireAuth Wrapper Component
 *
 * Reusable component that handles wallet connection check across dashboard pages.
 * Reduces duplicate "connect wallet" states and standardizes UX.
 *
 * Usage:
 * <RequireAuth>
 *   <YourProtectedContent />
 * </RequireAuth>
 */

import React from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { GlassCard } from '@/components/dashboard/shared/GlassCard'
import { Button } from '@/components/ui/button'
import { Wallet } from 'lucide-react'
import Link from 'next/link'

interface RequireAuthProps {
  /** Content to show when authenticated */
  children: React.ReactNode
  /** Optional custom message when not connected */
  message?: string
  /** Optional custom title when not connected */
  title?: string
  /** Show loading state while checking auth */
  showLoading?: boolean
}

/**
 * RequireAuth Component
 *
 * Wraps content that requires wallet connection.
 * Shows a friendly "connect wallet" state if not authenticated.
 */
export function RequireAuth({
  children,
  message = 'Connect your wallet to access this feature',
  title = 'Authentication Required',
  showLoading = true,
}: RequireAuthProps) {
  const { isConnected, isLoading } = useAuth()

  // Show loading state while checking authentication
  if (showLoading && isLoading) {
    return (
      <GlassCard className="p-16 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </GlassCard>
    )
  }

  // Show connect wallet state if not authenticated
  if (!isConnected) {
    return (
      <GlassCard className="p-16 flex flex-col items-center justify-center text-center border-dashed">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Wallet className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-md mb-8">{message}</p>
        <Button asChild size="lg">
          <Link href="/">Connect Wallet</Link>
        </Button>
      </GlassCard>
    )
  }

  // User is authenticated - show protected content
  return <>{children}</>
}

/**
 * Inline variant - minimal styling, for use in smaller contexts
 */
export function RequireAuthInline({ children, message }: RequireAuthProps) {
  const { isConnected } = useAuth()

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Wallet className="w-4 h-4" />
        <span>{message || 'Connect wallet to continue'}</span>
      </div>
    )
  }

  return <>{children}</>
}
