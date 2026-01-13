'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useTelegram } from '@/components/providers/TelegramProvider'
import { Sparkles, Loader2, Image as ImageIcon, Download, AlertCircle, Zap, ExternalLink, X } from 'lucide-react'
import { ErrorBoundary } from '@/components/error-boundary'

const TEMPLATES = [
  { id: 'raid', label: 'Raid Graphics', emoji: '🚀', desc: 'X/Twitter raids' },
  { id: 'meme', label: 'Meme', emoji: '😂', desc: 'Fun community memes' },
  { id: 'announcement', label: 'Announcement', emoji: '📢', desc: 'Product updates' },
  { id: 'infographic', label: 'Infographic', emoji: '📊', desc: 'Data visualization' },
  { id: 'quote', label: 'Quote Card', emoji: '💬', desc: 'Inspirational quotes' },
  { id: 'profile', label: 'Agent Profile', emoji: '🤖', desc: 'Agent showcases' },
] as const

const GHOST_TOKEN_ADDRESS = 'DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump'
const JUPITER_SWAP_URL = `https://jup.ag/swap/SOL-${GHOST_TOKEN_ADDRESS}`

export default function CreatePage() {
  const { userId, username } = useTelegram()
  const [selectedTemplate, setSelectedTemplate] = useState<string>('raid')
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
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

  const handleDownload = () => {
    if (!generatedImage) return
    window.open(generatedImage, '_blank')
  }

  const quotaPercentage = quota ? (quota.used / quota.limit) * 100 : 0
  const remaining = quota ? quota.limit - quota.used : 0

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
            Generate AI images with GhostSpeak branding - powered by Google Imagen 4
          </p>
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

        {/* Template Selector */}
        <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 shadow-md">
          <label className="mb-3 block text-sm font-medium text-card-foreground">
            Select Template
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
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
            Describe Your Image
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., 'Join the Ghost Army raid - trust the verified agents!'"
            rows={4}
            aria-label="Image description prompt"
            aria-describedby="prompt-hint"
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <span id="prompt-hint" className="sr-only">Describe the image you want to generate. Maximum 500 characters.</span>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim() || (quota !== null && quota.used >= quota.limit)}
            aria-label={isGenerating ? 'Generating image, please wait' : 'Generate AI image from your prompt'}
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
                Generate Image
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
        {generatedImage && (
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
                Template: {TEMPLATES.find((t) => t.id === selectedTemplate)?.label}
              </span>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {isGenerating && (
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

        {/* Empty State */}
        {!generatedImage && !error && !isGenerating && (
          <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-8 text-center">
            <div className="mb-4 text-6xl">✨</div>
            <h3 className="mb-2 text-lg font-semibold text-card-foreground">
              Ready to Create
            </h3>
            <p className="text-sm text-muted-foreground">
              Choose a template and describe your image to get started
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
                You've used all your generations for today
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
