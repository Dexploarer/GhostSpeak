'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useTelegram } from '@/components/providers/TelegramProvider'
import { Sparkles, Loader2, Image as ImageIcon, Download, AlertCircle, Zap, ExternalLink, X, FileText } from 'lucide-react'
import { ErrorBoundary } from '@/components/error-boundary'
import { TextGenerationDisplay } from '@/components/TextGenerationDisplay'
import type { ThreadTemplate, PostTemplate, RaidType } from '@/lib/types'

const IMAGE_TEMPLATES = [
  { id: 'raid', label: 'Raid Graphics', emoji: '🚀', desc: 'X/Twitter raids' },
  { id: 'meme', label: 'Meme', emoji: '😂', desc: 'Fun community memes' },
  { id: 'announcement', label: 'Announcement', emoji: '📢', desc: 'Product updates' },
  { id: 'infographic', label: 'Infographic', emoji: '📊', desc: 'Data visualization' },
  { id: 'quote', label: 'Quote Card', emoji: '💬', desc: 'Inspirational quotes' },
  { id: 'profile', label: 'Agent Profile', emoji: '🤖', desc: 'Agent showcases' },
] as const

const THREAD_TEMPLATES: Array<{ id: ThreadTemplate; label: string; emoji: string; desc: string }> = [
  { id: 'raid', label: 'Raid Thread', emoji: '🚀', desc: 'Coordinated X raids' },
  { id: 'announcement', label: 'Announcement', emoji: '📢', desc: 'Product updates' },
  { id: 'educational', label: 'Educational', emoji: '📚', desc: 'How-tos & guides' },
  { id: 'product', label: 'Product', emoji: '🎯', desc: 'Feature showcases' },
  { id: 'community', label: 'Community', emoji: '💚', desc: 'Milestones & thanks' },
  { id: 'alpha', label: 'Alpha', emoji: '🔥', desc: 'Insider insights' },
] as const

const POST_TEMPLATES: Array<{ id: PostTemplate; label: string; emoji: string; desc: string }> = [
  { id: 'hook', label: 'Hook', emoji: '🎣', desc: 'Attention-grabbing' },
  { id: 'question', label: 'Question', emoji: '❓', desc: 'Drive engagement' },
  { id: 'stat', label: 'Stat', emoji: '📊', desc: 'Data-driven' },
  { id: 'quote', label: 'Quote', emoji: '💬', desc: 'Inspirational' },
  { id: 'announcement', label: 'Announcement', emoji: '📢', desc: 'News & updates' },
  { id: 'meme', label: 'Meme', emoji: '😂', desc: 'Fun & playful' },
  { id: 'general', label: 'General', emoji: '✨', desc: 'Flexible' },
] as const

const RAID_TYPES: Array<{ id: RaidType; label: string; emoji: string; desc: string }> = [
  { id: 'product', label: 'Product Launch', emoji: '🎯', desc: 'Feature releases' },
  { id: 'partnership', label: 'Partnership', emoji: '🤝', desc: 'Collaborations' },
  { id: 'milestone', label: 'Milestone', emoji: '🏆', desc: 'Achievements' },
  { id: 'event', label: 'Event', emoji: '📅', desc: 'Conferences & meetups' },
  { id: 'general', label: 'General', emoji: '🚀', desc: 'Brand awareness' },
] as const

const GHOST_TOKEN_ADDRESS = 'DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump'
const JUPITER_SWAP_URL = `https://jup.ag/swap/SOL-${GHOST_TOKEN_ADDRESS}`

export default function CreatePage() {
  const { userId, username } = useTelegram()

  // Mode selection
  const [contentMode, setContentMode] = useState<'image' | 'text'>('image')

  // Image mode state
  const [selectedImageTemplate, setSelectedImageTemplate] = useState<string>('raid')
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)

  // Text mode state
  const [textType, setTextType] = useState<'thread' | 'post' | 'raid'>('thread')
  const [selectedThreadTemplate, setSelectedThreadTemplate] = useState<ThreadTemplate>('raid')
  const [selectedPostTemplate, setSelectedPostTemplate] = useState<PostTemplate>('hook')
  const [selectedRaidType, setSelectedRaidType] = useState<RaidType>('product')
  const [generatedTextMetadata, setGeneratedTextMetadata] = useState<any>(null)

  // Shared state
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quota, setQuota] = useState<{ used: number; limit: number; tier: 'free' | 'holder' } | null>(null)
  const [showQuotaModal, setShowQuotaModal] = useState(false)
  const [showLowQuotaWarning, setShowLowQuotaWarning] = useState(false)

  // Fetch quota on mount and after successful generation
  const fetchQuota = async () => {
    if (!userId) return

    try {
      const { getUserQuota } = await import('@/lib/api-client')
      const quotaData = await getUserQuota(String(userId))
      setQuota({
        used: quotaData.used,
        limit: quotaData.limit,
        tier: quotaData.tier === 'holder' || quotaData.tier === 'whale' ? 'holder' : 'free'
      })
    } catch (err) {
      console.error('Failed to fetch quota:', err)
    }
  }

  useEffect(() => {
    fetchQuota()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    // Pre-check quota
    if (quota && quota.used >= quota.limit) {
      setShowQuotaModal(true)
      return
    }

    // Show warning if only 1 left
    if (quota && quota.limit - quota.used === 1) {
      setShowLowQuotaWarning(true)
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedImage(null)
    setShowLowQuotaWarning(false)

    try {
      if (!userId) {
        throw new Error('Please authenticate with Telegram first')
      }

      // Import api-client dynamically
      const { generateImage, ApiError } = await import('@/lib/api-client')

      const data = await generateImage({
        userId: String(userId),
        message: prompt,
        characterId: 'boo',
        prompt,
        template: selectedTemplate,
      })

      // Extract image URL from response metadata
      const imageUrl = data.metadata?.imageUrl || data.metadata?.ui?.imageUrl || data.imageUrl

      if (!imageUrl) {
        throw new Error('No image generated. Try a different prompt!')
      }

      setGeneratedImage(imageUrl)

      // Refresh quota after successful generation
      await fetchQuota()
    } catch (err) {
      // Handle API errors with quota limit check
      const { ApiError } = await import('@/lib/api-client')
      if (err instanceof ApiError && err.status === 429) {
        setShowQuotaModal(true)
        return
      }

      setError(err instanceof Error ? err.message : 'Failed to generate image')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateText = async () => {
    if (!prompt.trim()) return

    // Pre-check quota
    if (quota && quota.used >= quota.limit) {
      setShowQuotaModal(true)
      return
    }

    // Show warning if only 1 left
    if (quota && quota.limit - quota.used === 1) {
      setShowLowQuotaWarning(true)
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedTextMetadata(null)
    setShowLowQuotaWarning(false)

    try {
      if (!userId) {
        throw new Error('Please authenticate with Telegram first')
      }

      // Determine which API method to call and build message
      let message = ''
      let apiMethod: any

      if (textType === 'thread') {
        message = `generate ${selectedThreadTemplate} thread about ${prompt}`
        const { generateThread } = await import('@/lib/api-client')
        apiMethod = generateThread
      } else if (textType === 'post') {
        message = `generate ${selectedPostTemplate} post about ${prompt}`
        const { generatePost } = await import('@/lib/api-client')
        apiMethod = generatePost
      } else if (textType === 'raid') {
        message = `generate ${selectedRaidType} raid content about ${prompt}`
        const { generateRaidContent } = await import('@/lib/api-client')
        apiMethod = generateRaidContent
      }

      const data = await apiMethod({
        userId: String(userId),
        message,
        characterId: 'boo' as const,
        topic: prompt,
        ...(textType === 'thread' && { template: selectedThreadTemplate }),
        ...(textType === 'post' && { template: selectedPostTemplate }),
        ...(textType === 'raid' && { raidType: selectedRaidType }),
      })

      if (!data.success || !data.metadata) {
        throw new Error('Text generation failed. Please try again!')
      }

      setGeneratedTextMetadata(data.metadata)

      // Refresh quota after successful generation
      await fetchQuota()
    } catch (err) {
      // Handle API errors with quota limit check
      const { ApiError } = await import('@/lib/api-client')
      if (err instanceof ApiError && err.status === 429) {
        setShowQuotaModal(true)
        return
      }

      setError(err instanceof Error ? err.message : 'Failed to generate text')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!generatedImage) return
    window.open(generatedImage, '_blank')
  }

  const quotaPercentage = quota ? (quota.used / quota.limit) * 100 : 0
  const remaining = quota ? quota.limit - quota.used : 0

  // Get current templates based on mode and type
  const currentTemplates = contentMode === 'image'
    ? IMAGE_TEMPLATES
    : textType === 'thread'
      ? THREAD_TEMPLATES
      : textType === 'post'
        ? POST_TEMPLATES
        : RAID_TYPES

  // Get selected template value
  const selectedTemplate = contentMode === 'image'
    ? selectedImageTemplate
    : textType === 'thread'
      ? selectedThreadTemplate
      : textType === 'post'
        ? selectedPostTemplate
        : selectedRaidType

  // Get placeholder text
  const placeholderText = contentMode === 'image'
    ? "E.g., 'Join the Ghost Army raid - trust the verified agents!'"
    : textType === 'thread'
      ? "E.g., 'Ghost Score launch - the credit rating for AI agents'"
      : textType === 'post'
        ? "E.g., 'GhostSpeak trust layer for AI commerce'"
        : "E.g., 'Ghost Score product launch with community raid'"

  return (
    <ErrorBoundary>
      <div className="min-h-screen p-4">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Header */}
          <div className="rounded-lg bg-primary p-6 shadow-lg">
            <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold text-primary-foreground drop-shadow-sm">
              <span className="text-3xl">🎨</span> Boo
            </h1>
            <p className="text-sm text-primary-foreground/90">
              {contentMode === 'image'
                ? 'Generate AI images with GhostSpeak branding - powered by Google Imagen 4'
                : 'Generate X/Twitter content - threads, posts, and raid packages'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-4 shadow-md">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setContentMode('image')
                  setError(null)
                  setGeneratedTextMetadata(null)
                }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium transition-all ${
                  contentMode === 'image'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                aria-label="Switch to image generation mode"
                aria-pressed={contentMode === 'image'}
              >
                <ImageIcon className="h-5 w-5" />
                Images
              </button>
              <button
                onClick={() => {
                  setContentMode('text')
                  setError(null)
                  setGeneratedImage(null)
                }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium transition-all ${
                  contentMode === 'text'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                aria-label="Switch to text generation mode"
                aria-pressed={contentMode === 'text'}
              >
                <FileText className="h-5 w-5" />
                Text
              </button>
            </div>
          </div>

        {/* Quota Display */}
        {quota && (
          <div className={`rounded-lg border-2 ${remaining === 0 ? 'border-red-500 bg-red-500/10' : remaining <= 1 ? 'border-yellow-500 bg-yellow-500/10' : 'border-primary/30 bg-primary/5'} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className={`h-5 w-5 ${remaining === 0 ? 'text-red-600' : remaining <= 1 ? 'text-yellow-600' : 'text-primary'}`} />
                <span className="font-semibold text-foreground">Daily Quota</span>
              </div>
              <div className={`text-2xl font-bold ${remaining === 0 ? 'text-red-600' : remaining <= 1 ? 'text-yellow-600' : 'text-primary'}`}>
                {remaining} / {quota.limit}
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all duration-300 ${
                  quotaPercentage <= 50 ? 'bg-green-500' :
                  quotaPercentage <= 80 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${quotaPercentage}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {quota.tier === 'free' ? '3 images/day (free tier)' : '100 images/day (holder tier)'}
            </div>
          </div>
        )}

        {/* Low Quota Warning */}
        {showLowQuotaWarning && remaining === 1 && (
          <div className="rounded-lg border-2 border-yellow-500 bg-yellow-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-bold text-foreground mb-1">Last Image for Today!</h3>
                <p className="text-sm text-muted-foreground">
                  This is your final generation. Upgrade to Holder tier for 100 images/day!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Text Type Selector (only in text mode) */}
        {contentMode === 'text' && (
          <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 shadow-md">
            <label className="mb-3 block text-sm font-medium text-card-foreground">
              Content Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setTextType('thread')}
                aria-pressed={textType === 'thread'}
                className={`rounded-lg border p-3 text-center transition-all ${
                  textType === 'thread'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                <div className="text-2xl mb-1">🧵</div>
                <div className="text-xs font-medium text-foreground">Thread</div>
              </button>
              <button
                onClick={() => setTextType('post')}
                aria-pressed={textType === 'post'}
                className={`rounded-lg border p-3 text-center transition-all ${
                  textType === 'post'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                <div className="text-2xl mb-1">📝</div>
                <div className="text-xs font-medium text-foreground">Post</div>
              </button>
              <button
                onClick={() => setTextType('raid')}
                aria-pressed={textType === 'raid'}
                className={`rounded-lg border p-3 text-center transition-all ${
                  textType === 'raid'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                <div className="text-2xl mb-1">🚀</div>
                <div className="text-xs font-medium text-foreground">Raid</div>
              </button>
            </div>
          </div>
        )}

        {/* Template Selector */}
        <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 shadow-md">
          <label className="mb-3 block text-sm font-medium text-card-foreground">
            {contentMode === 'image' ? 'Select Template' : `Select ${textType === 'thread' ? 'Thread' : textType === 'post' ? 'Post' : 'Raid'} Type`}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {currentTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  if (contentMode === 'image') {
                    setSelectedImageTemplate(template.id)
                  } else if (textType === 'thread') {
                    setSelectedThreadTemplate(template.id as ThreadTemplate)
                  } else if (textType === 'post') {
                    setSelectedPostTemplate(template.id as PostTemplate)
                  } else {
                    setSelectedRaidType(template.id as RaidType)
                  }
                }}
                aria-label={`Select ${template.label} template for ${template.desc}`}
                aria-pressed={selectedTemplate === template.id}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                  selectedTemplate === template.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                <span className="text-2xl" aria-hidden="true">{template.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    {template.label}
                  </div>
                  <div className="text-xs text-muted-foreground">{template.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Input */}
        <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 shadow-md">
          <label className="mb-2 block text-sm font-medium text-card-foreground">
            {contentMode === 'image' ? 'Describe Your Image' : 'Describe Your Content'}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholderText}
            rows={4}
            aria-label={contentMode === 'image' ? 'Image description prompt' : 'Text content prompt'}
            aria-describedby="prompt-hint"
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <span id="prompt-hint" className="sr-only">
            {contentMode === 'image'
              ? 'Describe the image you want to generate. Maximum 500 characters.'
              : 'Describe the topic for your X/Twitter content. Maximum 500 characters.'}
          </span>
          <button
            onClick={contentMode === 'image' ? handleGenerate : handleGenerateText}
            disabled={isGenerating || !prompt.trim() || (quota !== null && quota.used >= quota.limit)}
            aria-label={isGenerating
              ? `Generating ${contentMode}, please wait`
              : `Generate ${contentMode} from your prompt`}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" aria-hidden="true" />
                {contentMode === 'image' ? 'Generate Image' : 'Generate Content'}
              </>
            )}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Generated Image */}
        {contentMode === 'image' && generatedImage && (
          <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-card-foreground">
                Your Creation
              </h3>
              <button
                onClick={handleDownload}
                aria-label="Download generated image"
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download
              </button>
            </div>
            <div className="relative overflow-hidden rounded-lg aspect-square">
              <Image
                src={generatedImage}
                alt={`Generated image: ${prompt}`}
                fill
                className="object-cover"
                unoptimized
                priority
              />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              <span>
                Template: {IMAGE_TEMPLATES.find((t) => t.id === selectedImageTemplate)?.label}
              </span>
            </div>
          </div>
        )}

        {/* Generated Text */}
        {contentMode === 'text' && generatedTextMetadata && (
          <TextGenerationDisplay
            type={textType === 'thread' ? 'thread' : textType === 'post' ? 'post' : 'raid_package'}
            metadata={generatedTextMetadata}
          />
        )}

        {/* Loading Skeleton */}
        {isGenerating && contentMode === 'image' && (
          <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 shadow-md">
            <div className="mb-4">
              <div className="h-6 w-32 rounded bg-muted animate-pulse" />
            </div>
            <div className="aspect-square w-full rounded-lg bg-muted animate-pulse" />
            <div className="mt-3 flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-muted animate-pulse" />
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            </div>
          </div>
        )}

        {isGenerating && contentMode === 'text' && (
          <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 shadow-md">
            <div className="mb-4">
              <div className="h-6 w-48 rounded bg-muted animate-pulse" />
              <div className="mt-2 h-4 w-32 rounded bg-muted animate-pulse" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                  <div className="h-16 w-full rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!generatedImage && !generatedTextMetadata && !error && !isGenerating && (
          <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-8 text-center">
            <div className="mb-4 text-6xl">{contentMode === 'image' ? '✨' : '📝'}</div>
            <h3 className="mb-2 text-lg font-semibold text-card-foreground">
              Ready to Create
            </h3>
            <p className="text-sm text-muted-foreground">
              {contentMode === 'image'
                ? 'Choose a template and describe your image to get started'
                : `Choose a ${textType} type and describe your topic to get started`}
            </p>
          </div>
        )}
        </div>
      </div>

      {/* Quota Exceeded Modal */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card rounded-lg shadow-2xl max-w-md w-full border-2 border-red-500 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-8 w-8" />
                  <h2 className="text-2xl font-bold">Daily Limit Reached</h2>
                </div>
                <button
                  onClick={() => setShowQuotaModal(false)}
                  className="text-white/80 hover:text-white transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <p className="text-white/90 text-sm">
                You&apos;ve used all your generations for today
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-semibold text-foreground">Free Tier</div>
                    <div className="text-sm text-muted-foreground">Default for all users</div>
                  </div>
                  <div className="text-xl font-bold text-foreground">3/day</div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30 rounded-lg">
                  <div>
                    <div className="font-bold text-foreground flex items-center gap-2">
                      Holder Tier
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">RECOMMENDED</span>
                    </div>
                    <div className="text-sm text-muted-foreground">Hold $10+ $GHOST</div>
                  </div>
                  <div className="text-2xl font-bold text-green-600">100/day</div>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  How to Upgrade
                </h3>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Buy at least $10 worth of $GHOST tokens</li>
                  <li>Keep tokens in your connected wallet</li>
                  <li>Get instant access to 100 daily generations</li>
                </ol>
              </div>

              <div className="space-y-2">
                <a
                  href={JUPITER_SWAP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg"
                >
                  <span>Buy $GHOST on Jupiter</span>
                  <ExternalLink className="h-4 w-4" />
                </a>

                <button
                  onClick={() => setShowQuotaModal(false)}
                  className="w-full bg-muted hover:bg-muted/80 text-foreground font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Maybe Later
                </button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Your quota resets at midnight (24h cycle)
              </p>
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  )
}
