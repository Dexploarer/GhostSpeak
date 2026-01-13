'use client'

import { useState } from 'react'
import { useTelegram } from '@/components/providers/TelegramProvider'
import { Sparkles, Loader2, Image as ImageIcon, Download } from 'lucide-react'

const TEMPLATES = [
  { id: 'raid', label: 'Raid Graphics', emoji: '🚀', desc: 'X/Twitter raids' },
  { id: 'meme', label: 'Meme', emoji: '😂', desc: 'Fun community memes' },
  { id: 'announcement', label: 'Announcement', emoji: '📢', desc: 'Product updates' },
  { id: 'infographic', label: 'Infographic', emoji: '📊', desc: 'Data visualization' },
  { id: 'quote', label: 'Quote Card', emoji: '💬', desc: 'Inspirational quotes' },
  { id: 'profile', label: 'Agent Profile', emoji: '🤖', desc: 'Agent showcases' },
] as const

export default function CreatePage() {
  const { firstName, username } = useTelegram()
  const [selectedTemplate, setSelectedTemplate] = useState<string>('raid')
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)
    setGeneratedImage(null)

    try {
      // Route through Boo character on web app
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Generate a ${selectedTemplate} image: ${prompt}`,
          characterId: 'boo',
          source: 'telegram',
          userId: username || `telegram_${Date.now()}`,
          metadata: {
            template: selectedTemplate,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Image generation failed')
      }

      const data = await response.json()

      // Extract image URL from Boo's response
      const imageUrl = data.metadata?.imageUrl || data.imageUrl

      if (!imageUrl) {
        throw new Error('No image URL in response')
      }

      setGeneratedImage(imageUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!generatedImage) return
    window.open(generatedImage, '_blank')
  }

  return (
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
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                  selectedTemplate === template.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                <span className="text-2xl">{template.emoji}</span>
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
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
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
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
            <div className="overflow-hidden rounded-lg">
              <img
                src={generatedImage}
                alt="Generated image"
                className="w-full h-auto"
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
  )
}
