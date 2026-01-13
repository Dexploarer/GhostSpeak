'use client'

import { useState, useEffect } from 'react'
import { useTelegram } from '@/components/providers/TelegramProvider'
import { Wallet, TrendingUp, Clock, Zap, Loader2 } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { JupiterSwapModal } from '@/components/JupiterSwapModal'
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton'

export default function ProfilePage() {
  const { userId, username, firstName, lastName, isPremium } = useTelegram()
  const [isLoading, setIsLoading] = useState(true)
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false)

  const walletAddress = userId ? `telegram_${userId}` : null

  // Fetch quota status from Convex
  const quotaData = useQuery(
    api.messageQuota.checkMessageQuota,
    walletAddress ? { walletAddress } : 'skip'
  )

  // Fetch user tier info from Convex
  const tierData = useQuery(
    api.messageQuota.getUserTier,
    walletAddress ? { walletAddress } : 'skip'
  )

  // Check if user has linked a real Solana wallet
  const hasLinkedWallet = walletAddress ? !walletAddress.startsWith('telegram_') : false

  useEffect(() => {
    if (quotaData !== undefined && tierData !== undefined) {
      setIsLoading(false)
    }
  }, [quotaData, tierData])

  // Map quota data
  const quota = quotaData && tierData
    ? {
        used: quotaData.currentCount || 0,
        limit: quotaData.limit,
        tier: quotaData.tier,
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Reset at midnight UTC
      }
    : {
        used: 0,
        limit: 5,
        tier: 'free' as const,
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }

  // Map balance data from tier info
  const ghostHoldings = tierData
    ? {
        balance: 0, // We don't have token balance, only USD value
        usdValue: tierData.cachedBalanceUsd || 0,
      }
    : {
        balance: 0,
        usdValue: 0,
      }

  const quotaPercentage = (quota.used / quota.limit) * 100
  const timeUntilReset = Math.floor(
    (quota.resetTime.getTime() - Date.now()) / (1000 * 60 * 60)
  )

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'whale':
        return { label: '🐋 Whale', color: 'text-primary' }
      case 'holder':
        return { label: '💎 Holder', color: 'text-blue-500' }
      default:
        return { label: '🆓 Free', color: 'text-muted-foreground' }
    }
  }

  const handleBuyGhost = () => {
    // Open Jupiter swap modal
    setIsSwapModalOpen(true)
  }

  const tierInfo = getTierInfo(quota.tier)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="rounded-lg bg-primary p-6 shadow-lg">
          <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold text-primary-foreground drop-shadow-sm">
            <span className="text-3xl">👤</span> Profile
          </h1>
          <p className="text-sm text-primary-foreground/90">
            Your account, quota, and $GHOST holdings
          </p>
        </div>

        {/* User Info */}
        <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 shadow-md">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-3xl">
              👻
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-card-foreground">
                {firstName} {lastName}
              </p>
              {username && (
                <p className="text-sm text-muted-foreground">@{username}</p>
              )}
            </div>
            {isPremium && (
              <div className="rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
                Premium
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
            <div className="rounded-lg bg-muted p-3">
              <div className="mb-1 text-xs text-muted-foreground">User ID</div>
              <div className="font-mono text-sm font-semibold text-foreground">
                {userId}
              </div>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <div className="mb-1 text-xs text-muted-foreground">Member Since</div>
              <div className="text-sm font-semibold text-foreground">Jan 2026</div>
            </div>
          </div>
        </div>

        {/* Quota Card */}
        <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-card-foreground">Message Quota</h2>
            <Zap className="h-5 w-5 text-primary" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Tier</span>
              <span className={`rounded-full bg-accent px-3 py-1 text-sm font-medium ${tierInfo.color}`}>
                {tierInfo.label}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${quotaPercentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {quota.used} / {quota.limit} messages
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                Resets in {timeUntilReset}h
              </span>
            </div>
          </div>
        </div>

        {/* $GHOST Holdings */}
        <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-card-foreground">
              $GHOST Holdings
            </h2>
            <Wallet className="h-5 w-5 text-primary" />
          </div>

          {!hasLinkedWallet ? (
            <div className="mb-6 rounded-lg border-2 border-dashed border-border bg-muted/50 p-6 text-center">
              <Wallet className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
              <p className="mb-2 text-sm font-medium text-foreground">No Wallet Linked</p>
              <p className="text-xs text-muted-foreground">
                Connect a Solana wallet to check your $GHOST balance and upgrade your tier
              </p>
            </div>
          ) : (
            <div className="mb-6 rounded-lg bg-muted p-4 text-center">
              <div className="mb-1 text-3xl font-bold text-foreground">
                {ghostHoldings.balance.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                ≈ ${ghostHoldings.usdValue.toFixed(2)} USD
              </div>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🆓</span>
                <span className="text-foreground">Free Tier</span>
              </div>
              <span className="text-muted-foreground">5 msgs/day</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <span className="text-base">💎</span>
                <span className="text-foreground">Holder</span>
              </div>
              <span className="text-muted-foreground">$10+ • 25 msgs/day</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-primary bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🐋</span>
                <span className="text-foreground">Whale</span>
              </div>
              <span className="text-primary">$100+ • 100 msgs/day</span>
            </div>
          </div>

          {!hasLinkedWallet ? (
            <div className="mt-4">
              <ConnectWalletButton />
            </div>
          ) : (
            <button
              onClick={handleBuyGhost}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <TrendingUp className="h-4 w-4" />
              Buy $GHOST on Jupiter
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-4">
            <div className="mb-2 text-2xl font-bold text-primary">0</div>
            <div className="text-xs text-muted-foreground">Agents Verified</div>
          </div>
          <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-4">
            <div className="mb-2 text-2xl font-bold text-primary">0</div>
            <div className="text-xs text-muted-foreground">Images Generated</div>
          </div>
        </div>
      </div>

      {/* Jupiter Swap Modal */}
      <JupiterSwapModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
      />
    </div>
  )
}
