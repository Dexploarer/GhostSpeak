'use client'

import { useTelegram } from '@/components/providers/TelegramProvider'
import { Clock, Zap, ImageIcon } from 'lucide-react'
import { useState, useEffect } from 'react'

interface UserImage {
  _id: string
  storageUrl: string
  prompt: string
  templateId?: string
  createdAt: number
  upvotes: number
  downvotes: number
}

export default function ProfilePage() {
  const { userId, username, firstName, lastName, isPremium } = useTelegram()
  const [userImages, setUserImages] = useState<UserImage[]>([])
  const [quota, setQuota] = useState({ used: 0, limit: 3 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    // Fetch user's images and quota
    async function fetchUserData() {
      try {
        const webAppUrl = process.env.NEXT_PUBLIC_WEB_APP_URL || 'https://ghostspeak.io'
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://lovely-cobra-639.convex.cloud'
        const walletAddress = `telegram_${userId}`

        // Fetch user's images from Convex
        const imagesResponse = await fetch(
          `${convexUrl}/api/query?format=convex-encoded-json`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              path: 'images:getUserImages',
              args: { userId: walletAddress, limit: 50 },
            }),
          }
        )

        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json()
          setUserImages(imagesData.value || [])
        }

        // Fetch quota (we'll use message count as proxy for image count)
        const quotaResponse = await fetch(`${webAppUrl}/api/agent/chat/quota?userId=${walletAddress}`)
        if (quotaResponse.ok) {
          const quotaData = await quotaResponse.json()
          setQuota(quotaData.quota || { used: 0, limit: 3 })
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [userId])

  const quotaPercentage = (quota.used / quota.limit) * 100
  const timeUntilReset = Math.floor(
    (new Date().setHours(24, 0, 0, 0) - Date.now()) / (1000 * 60 * 60)
  )

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="rounded-lg bg-primary p-6 shadow-lg">
          <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold text-primary-foreground drop-shadow-sm">
            <span className="text-3xl">👤</span> Profile
          </h1>
          <p className="text-sm text-primary-foreground/90">
            Your account and daily image generations
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

        {/* Daily Quota */}
        <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-card-foreground">Daily Generations</h2>
            <Zap className="h-5 w-5 text-primary" />
          </div>

          <div className="space-y-3">
            {/* Progress Bar */}
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${quotaPercentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {quota.used} / {quota.limit} images today
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                Resets in {timeUntilReset}h
              </span>
            </div>

            <p className="pt-2 text-xs text-muted-foreground">
              Every Telegram user gets 3 free AI-generated images per day
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-4">
            <div className="mb-2 text-2xl font-bold text-primary">{userImages.length}</div>
            <div className="text-xs text-muted-foreground">Total Images</div>
          </div>
          <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-4">
            <div className="mb-2 text-2xl font-bold text-primary">{quota.limit - quota.used}</div>
            <div className="text-xs text-muted-foreground">Remaining Today</div>
          </div>
        </div>

        {/* My Images Gallery */}
        <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-card-foreground">My Images</h2>
            <ImageIcon className="h-5 w-5 text-primary" />
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading your images...
            </div>
          ) : userImages.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mb-2 text-4xl">🎨</div>
              <p className="text-sm text-muted-foreground">
                No images yet. Start creating in the Create tab!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {userImages.map((image) => (
                <div
                  key={image._id}
                  className="group relative overflow-hidden rounded-lg border border-border bg-background"
                >
                  <img
                    src={image.storageUrl}
                    alt={image.prompt}
                    className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="line-clamp-2 text-xs text-white">
                        {image.prompt}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-white/80">
                        <span>👍 {image.upvotes}</span>
                        {image.templateId && (
                          <span className="rounded bg-white/20 px-1.5 py-0.5">
                            {image.templateId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
