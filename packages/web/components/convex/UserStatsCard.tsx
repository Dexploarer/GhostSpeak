/**
 * User Stats Card Component
 *
 * Displays user's stats from Convex database
 */

'use client'

import React from 'react'
import { DollarSign, Zap, MessageSquare, Heart, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useConvexUser } from '@/lib/hooks/useConvexUser'
import { usePaymentStats } from '@/lib/hooks/useConvexPayments'
import { useConvexFavorites } from '@/lib/hooks/useConvexFavorites'
import { useConvexConversations } from '@/lib/hooks/useConvexConversations'

export function UserStatsCard(): React.JSX.Element | null {
  const { user, isAuthenticated, isLoading: userLoading } = useConvexUser()
  const { stats, isLoading: statsLoading } = usePaymentStats()
  const { favorites } = useConvexFavorites()
  const { conversations } = useConvexConversations()

  if (!isAuthenticated) return null

  const isLoading = userLoading || statsLoading

  return (
    <Card className="bg-linear-to-br from-lime-500/10 to-emerald-500/10 border-lime-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-lime-400" />
          Your Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-zinc-800 rounded w-3/4" />
            <div className="h-4 bg-zinc-800 rounded w-1/2" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatItem
              icon={Zap}
              label="Payments"
              value={stats.totalPayments.toString()}
              color="text-yellow-400"
            />
            <StatItem
              icon={DollarSign}
              label="Total Spent"
              value={`$${stats.totalSpent.toFixed(2)}`}
              color="text-green-400"
            />
            <StatItem
              icon={Heart}
              label="Favorites"
              value={favorites.length.toString()}
              color="text-red-400"
            />
            <StatItem
              icon={MessageSquare}
              label="Conversations"
              value={conversations.length.toString()}
              color="text-blue-400"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface StatItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  color: string
}

function StatItem({ icon: Icon, label, value, color }: StatItemProps) {
  return (
    <div className="text-center">
      <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  )
}

/**
 * Compact inline stats for headers/navbars
 */
export function UserStatsInline(): React.JSX.Element | null {
  const { isAuthenticated } = useConvexUser()
  const { stats } = usePaymentStats()
  const { favorites } = useConvexFavorites()

  if (!isAuthenticated) return null

  return (
    <div className="flex items-center gap-4 text-sm text-zinc-500">
      <span className="flex items-center gap-1">
        <Zap className="w-3.5 h-3.5 text-yellow-400" />
        {stats.totalPayments}
      </span>
      <span className="flex items-center gap-1">
        <Heart className="w-3.5 h-3.5 text-red-400" />
        {favorites.length}
      </span>
      <span className="flex items-center gap-1">
        <DollarSign className="w-3.5 h-3.5 text-green-400" />
        ${stats.totalSpent.toFixed(2)}
      </span>
    </div>
  )
}
