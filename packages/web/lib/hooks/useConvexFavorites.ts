/**
 * Convex Favorites Hook
 *
 * Manage user's favorite x402 resources
 */

'use client'

import { useQuery, useMutation } from 'convex/react'
import { useMemo, useCallback } from 'react'
import { api } from '@/convex/_generated/api'
import { useUserId } from '@/lib/stores/auth.store'
import type { Id } from '@/convex/_generated/dataModel'

export interface Favorite {
  _id: Id<'favorites'>
  userId: Id<'users'>
  resourceId: string
  resourceUrl: string
  resourceName: string
  category?: string
  addedAt: number
}

export function useConvexFavorites() {
  const userId = useUserId()

  // Query all favorites for current user
  const favorites = useQuery(api.favorites.getByUser, userId ? { userId } : 'skip') as
    | Favorite[]
    | undefined

  // Mutations
  const addFavorite = useMutation(api.favorites.add)
  const removeFavorite = useMutation(api.favorites.remove)
  const toggleFavorite = useMutation(api.favorites.toggle)

  // Check if a resource is favorited
  const isFavorited = useCallback(
    (resourceId: string): boolean => {
      if (!favorites) return false
      return favorites.some((f) => f.resourceId === resourceId)
    },
    [favorites]
  )

  // Add a resource to favorites
  const add = useCallback(
    async (resource: {
      resourceId: string
      resourceUrl: string
      resourceName: string
      category?: string
    }) => {
      if (!userId) return null
      return addFavorite({ userId, ...resource })
    },
    [userId, addFavorite]
  )

  // Remove a resource from favorites
  const remove = useCallback(
    async (resourceId: string) => {
      if (!userId) return
      return removeFavorite({ userId, resourceId })
    },
    [userId, removeFavorite]
  )

  // Toggle favorite status
  const toggle = useCallback(
    async (resource: {
      resourceId: string
      resourceUrl: string
      resourceName: string
      category?: string
    }) => {
      if (!userId) return null
      return toggleFavorite({ userId, ...resource })
    },
    [userId, toggleFavorite]
  )

  return useMemo(
    () => ({
      favorites: favorites ?? [],
      isLoading: favorites === undefined && userId !== null,
      isFavorited,
      add,
      remove,
      toggle,
    }),
    [favorites, userId, isFavorited, add, remove, toggle]
  )
}

/**
 * Hook to check if a specific resource is favorited
 */
export function useIsFavorited(resourceId: string) {
  const { isFavorited, isLoading } = useConvexFavorites()
  return { isFavorited: isFavorited(resourceId), isLoading }
}
