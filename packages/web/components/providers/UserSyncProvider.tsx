/**
 * User Sync Provider
 *
 * Place this component high in the tree to enable automatic user sync
 * when wallet connects. It will create/update user records in Convex.
 */

'use client'

import { useEffect } from 'react'
import { useConvexUserSync } from '@/lib/hooks/useConvexUser'

interface UserSyncProviderProps {
  children: React.ReactNode
}

export function UserSyncProvider({ children }: UserSyncProviderProps): React.JSX.Element {
  // This hook handles auto-sync on wallet connect
  const { user, isLoading } = useConvexUserSync()

  // Optional: Log user sync status in dev
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && user) {
      console.log('[UserSync] User synced:', user._id, user.walletAddress)
    }
  }, [user])

  return <>{children}</>
}
