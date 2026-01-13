'use client'

import Image from 'next/image'
import { useTelegram } from '@/components/providers/TelegramProvider'
import { Clock, Zap, ImageIcon, TrendingUp, ExternalLink, MessageSquare, Loader2, Users, ThumbsUp, ThumbsDown, Eye } from 'lucide-react'
import { useState, useEffect } from 'react'
import { ErrorBoundary } from '@/components/error-boundary'
import { isDevelopment } from '@/lib/env'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

interface UserImage {
  _id: string
  storageUrl: string
  prompt: string
  templateId?: string
  createdAt: number
  upvotes: number
  downvotes: number
}

interface GalleryImage {
  _id: Id<'generatedImages'>
  storageUrl: string
  prompt: string
  templateId?: string
  userId: string
  upvotes: number
  downvotes: number
  views: number
  createdAt: number
}

const GHOST_TOKEN_ADDRESS = 'DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump'
const JUPITER_SWAP_URL = `https://jup.ag/swap/SOL-${GHOST_TOKEN_ADDRESS}`

// Format timestamp to relative time (e.g., "2 hours ago")
function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  return 'Just now'
}

export default function ProfilePage() {
  const { userId, username, firstName, lastName, isPremium } = useTelegram()
  const [userImages, setUserImages] = useState<UserImage[]>([])
  const [quota, setQuota] = useState({ used: 0, limit: 3, tier: 'free' as 'free' | 'holder' })
  const [isLoading, setIsLoading] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [historyLimit, setHistoryLimit] = useState(20)
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)
  const [galleryTab, setGalleryTab] = useState<'recent' | 'trending'>('recent')

  // Fetch chat history using Convex
  const chatHistory = useQuery(
    api.agent.getChatHistory,
    userId ? { walletAddress: `telegram_${userId}`, limit: historyLimit } : 'skip'
  )

  // Fetch gallery images from Convex (safely handling missing functions)
  const galleryImages = useQuery(
    api.images?.getGalleryImages as any,
    galleryTab === 'recent' ? { limit: 20 } : undefined
  ) as GalleryImage[] | undefined

  const trendingImages = useQuery(
    api.images?.getTrendingImages as any,
    galleryTab === 'trending' ? { limit: 20 } : undefined
  ) as GalleryImage[] | undefined

  // Vote mutation (safely handling missing functions)
  const voteOnImageMutation = useMutation(api.images?.voteOnImage as any)

  // Calculate time until quota reset (24h cycle)
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now()
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)
      const msRemaining = midnight.getTime() - now

      const hours = Math.floor(msRemaining / (1000 * 60 * 60))
      const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((msRemaining % (1000 * 60)) / 1000)

      setTimeRemaining({ hours, minutes, seconds })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!userId) return

    // Fetch user's images and quota
    async function fetchUserData() {
      try {
        // Import api-client dynamically
        const { getUserImages, getUserQuota } = await import('@/lib/api-client')

        // Fetch user's images from Convex
        try {
          const imagesData = await getUserImages(String(userId))
          setUserImages(imagesData || [])
        } catch (error) {
          if (isDevelopment) {
            console.error('[Dev] Failed to fetch images:', error)
          }
        }

        // Fetch quota (we'll use message count as proxy for image count)
        try {
          const quotaData = await getUserQuota(String(userId))
          setQuota({
            used: quotaData.used,
            limit: quotaData.limit,
            tier: quotaData.tier === 'holder' || quotaData.tier === 'whale' ? 'holder' : 'free'
          })
        } catch (error) {
          if (isDevelopment) {
            console.error('[Dev] Failed to fetch quota:', error)
          }
        }
      } catch (error) {
        if (isDevelopment) {
          console.error('[Dev] Failed to fetch user data:', error)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [userId])

  const quotaPercentage = (quota.used / quota.limit) * 100

  // Color coding based on percentage
  const getQuotaColor = () => {
    if (quotaPercentage <= 50) return { bg: 'bg-green-500', text: 'text-green-600', border: 'border-green-500' }
    if (quotaPercentage <= 80) return { bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-500' }
    return { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-500' }
  }

  const quotaColor = getQuotaColor()

  // Handle voting
  const handleVote = async (imageId: Id<'generatedImages'>, voteType: 'up' | 'down') => {
    if (!userId || !voteOnImageMutation) return

    try {
      await voteOnImageMutation({
        imageId,
        userId: `telegram_${userId}`,
        vote: voteType,
      })
    } catch (error) {
      if (isDevelopment) {
        console.error('[Dev] Failed to vote:', error)
      }
    }
  }

  // Get images to display based on tab
  const displayImages = galleryTab === 'recent' ? galleryImages : trendingImages

  return (
    <ErrorBoundary>
      <div className="min-h-screen p-4 pb-24">
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

        {/* Daily Quota - ENHANCED */}
        <div className={`rounded-lg border-2 ${quotaColor.border} bg-card shadow-lg overflow-hidden`}>
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-primary to-primary/80 p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-primary-foreground flex items-center gap-2">
                <Zap className="h-6 w-6" />
                Daily Generation Quota
              </h2>
              <div className={`px-3 py-1 rounded-full ${quota.tier === 'holder' ? 'bg-yellow-500/20 text-yellow-100' : 'bg-white/20 text-white'} text-xs font-semibold uppercase tracking-wide`}>
                {quota.tier} Tier
              </div>
            </div>
            <p className="text-sm text-primary-foreground/90">
              {quota.tier === 'holder' ? 'Holder benefits active!' : 'Upgrade to unlock more generations'}
            </p>
          </div>

          <div className="p-6 space-y-4">
            {/* Large quota display */}
            <div className="text-center py-4">
              <div className={`text-6xl font-bold ${quotaColor.text} mb-2`}>
                {quota.limit - quota.used}
              </div>
              <div className="text-sm text-muted-foreground uppercase tracking-wide">
                Generations Remaining
              </div>
            </div>

            {/* Progress Bar - Enhanced */}
            <div className="space-y-2">
              <div className="h-6 overflow-hidden rounded-full bg-muted border-2 border-border">
                <div
                  className={`h-full ${quotaColor.bg} transition-all duration-500 ease-out flex items-center justify-end pr-2`}
                  style={{ width: `${quotaPercentage}%` }}
                >
                  {quotaPercentage > 15 && (
                    <span className="text-xs font-bold text-white drop-shadow">
                      {Math.round(quotaPercentage)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm font-medium">
                <span className={quotaColor.text}>
                  {quota.used} / {quota.limit} used
                </span>
                <span className="text-muted-foreground">
                  {quota.limit - quota.used} left
                </span>
              </div>
            </div>

            {/* Countdown Timer */}
            <div className="bg-muted rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Quota Resets In
                </span>
                <div className="flex items-center gap-1 text-2xl font-bold text-primary font-mono">
                  <span className="bg-background px-2 py-1 rounded">{String(timeRemaining.hours).padStart(2, '0')}</span>
                  <span>:</span>
                  <span className="bg-background px-2 py-1 rounded">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                  <span>:</span>
                  <span className="bg-background px-2 py-1 rounded">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                Your quota refreshes at midnight (24h cycle)
              </div>
            </div>

            {/* Tier Comparison */}
            {quota.tier === 'free' && (
              <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-3">
                  <TrendingUp className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground mb-1">Upgrade to Holder Tier</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Hold $10+ of $GHOST tokens to unlock 100 daily generations!
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Free Tier:</span>
                        <span className="font-semibold">3 images/day</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Holder Tier ($10+ $GHOST):</span>
                        <span className="font-bold text-green-600">100 images/day</span>
                      </div>
                    </div>
                  </div>
                </div>
                <a
                  href={JUPITER_SWAP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg"
                >
                  <span>Buy $GHOST on Jupiter</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}

            {quota.tier === 'holder' && (
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">🎉</div>
                <h3 className="font-bold text-foreground mb-1">Holder Benefits Active!</h3>
                <p className="text-sm text-muted-foreground">
                  You have 100 daily generations. Thanks for supporting $GHOST!
                </p>
              </div>
            )}
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
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="aspect-square w-full rounded-lg bg-muted animate-pulse"
                />
              ))}
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
                  className="group relative overflow-hidden rounded-lg border border-border bg-background aspect-square"
                >
                  <Image
                    src={image.storageUrl}
                    alt={image.prompt || 'Generated image'}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    unoptimized
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

        {/* Community Gallery */}
        <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-card-foreground">Community Gallery</h2>
              <Users className="h-5 w-5 text-primary" />
            </div>
          </div>

          {/* Tab Selector */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setGalleryTab('recent')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                galleryTab === 'recent'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              aria-label="Show recent images"
            >
              Recent
            </button>
            <button
              onClick={() => setGalleryTab('trending')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                galleryTab === 'trending'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              aria-label="Show trending images"
            >
              Trending
            </button>
          </div>

          {/* Gallery Grid */}
          {!displayImages ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="aspect-square w-full rounded-lg bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : displayImages.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mb-2 text-4xl">🖼️</div>
              <p className="text-sm text-muted-foreground">
                No community images yet. Be the first to create!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {displayImages.map((image) => (
                <div
                  key={image._id}
                  className="group relative overflow-hidden rounded-lg border border-border bg-background aspect-square cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View image: ${image.prompt}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedImage(image)
                    }
                  }}
                >
                  <Image
                    src={image.storageUrl}
                    alt={image.prompt || 'Community image'}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="line-clamp-2 text-xs text-white mb-1">
                        {image.prompt}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-white/90">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {image.upvotes}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {image.views}
                        </span>
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

        {/* Chat History */}
        <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-card-foreground">Chat History</h2>
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>

          {chatHistory === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : !chatHistory || chatHistory.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mb-2 text-4xl">💬</div>
              <p className="text-sm text-muted-foreground">
                No chat history yet. Start a conversation with Caisper or Boo!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {chatHistory.map((msg, idx) => {
                const isAgent = msg.role === 'agent'
                const agentAvatar = msg.metadata?.characterId === 'boo' ? '🎨' : '👻'
                const agentName = msg.metadata?.characterId === 'boo' ? 'Boo' : 'Caisper'

                return (
                  <div
                    key={idx}
                    className={`flex gap-3 ${isAgent ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xl ${
                        isAgent ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      {isAgent ? agentAvatar : '👤'}
                    </div>

                    {/* Message Bubble */}
                    <div className="flex-1 space-y-1">
                      <div
                        className={`rounded-lg px-4 py-3 ${
                          isAgent
                            ? 'bg-primary/10 border border-primary/20'
                            : 'bg-muted border border-border'
                        }`}
                      >
                        {isAgent && (
                          <div className="mb-1 text-xs font-semibold text-primary">
                            {agentName}
                          </div>
                        )}
                        <p className="text-sm text-foreground leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                      <div
                        className={`flex items-center gap-2 px-1 text-xs text-muted-foreground ${
                          isAgent ? '' : 'justify-end'
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        <span>{formatRelativeTime(msg.timestamp)}</span>
                        {msg.actionTriggered && (
                          <span className="rounded bg-primary/20 px-1.5 py-0.5 text-xs text-primary">
                            {msg.actionTriggered}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Load More Button */}
              {chatHistory && chatHistory.length >= historyLimit && (
                <button
                  onClick={() => setHistoryLimit((prev) => prev + 20)}
                  className="w-full rounded-lg border border-primary bg-primary/10 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  Load More Messages
                </button>
              )}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="image-modal-title"
        >
          <div
            className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="relative w-full aspect-square">
              <Image
                src={selectedImage.storageUrl}
                alt={selectedImage.prompt || 'Full size image'}
                fill
                className="object-contain"
                unoptimized
              />
            </div>

            {/* Details */}
            <div className="p-6 space-y-4">
              <div>
                <h3 id="image-modal-title" className="text-lg font-semibold text-card-foreground mb-2">
                  Prompt
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedImage.prompt}
                </p>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {selectedImage.views} views
                </span>
                {selectedImage.templateId && (
                  <span className="rounded bg-muted px-2 py-1 text-xs">
                    {selectedImage.templateId}
                  </span>
                )}
                <span className="text-xs">
                  {new Date(selectedImage.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Voting */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleVote(selectedImage._id, 'up')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-green-600 hover:bg-green-500/30 transition-colors"
                  aria-label="Upvote image"
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span className="font-semibold">{selectedImage.upvotes}</span>
                </button>
                <button
                  onClick={() => handleVote(selectedImage._id, 'down')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-600 hover:bg-red-500/30 transition-colors"
                  aria-label="Downvote image"
                >
                  <ThumbsDown className="h-4 w-4" />
                  <span className="font-semibold">{selectedImage.downvotes}</span>
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedImage(null)}
                className="w-full py-3 px-4 bg-muted hover:bg-muted/80 rounded-lg font-medium transition-colors"
                aria-label="Close modal"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  )
}
