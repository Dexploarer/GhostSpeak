/**
 * x402 Resource Registration Page
 *
 * Register new x402 resources with automatic validation and metadata scraping
 */

'use client'

import React, { useState, useCallback } from 'react'
import {
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
  Tag,
  Sparkles,
  AlertCircle,
  Info,
  DollarSign,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// =====================================================
// TYPES
// =====================================================

interface ValidationResult {
  status: 'idle' | 'validating' | 'valid' | 'invalid'
  message?: string
  x402Response?: {
    version: string
    accepts: Array<{
      network: string
      amount: string
      token: string
      payTo: string
    }>
    inputSchema?: object
    outputSchema?: object
  }
  metadata?: {
    title?: string
    description?: string
    favicon?: string
    ogImage?: string
  }
  suggestedTags?: string[]
  suggestedCategory?: string
}

interface RegistrationForm {
  url: string
  name: string
  description: string
  category: string
  tags: string[]
  customTag: string
}

// =====================================================
// COMPONENTS
// =====================================================

function ValidationStatus({ result }: { result: ValidationResult }) {
  if (result.status === 'idle') return null

  if (result.status === 'validating') {
    return (
      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Validating x402 response...</span>
      </div>
    )
  }

  if (result.status === 'valid') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Valid x402 Resource</span>
        </div>

        {result.x402Response && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-sm font-medium mb-2">Payment Options:</p>
            <div className="space-y-1">
              {result.x402Response.accepts.map((accept, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <Badge variant="outline" className="text-xs">
                    {accept.network}
                  </Badge>
                  <span>{accept.amount}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-mono text-xs truncate max-w-[200px]">{accept.payTo}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
      <XCircle className="w-5 h-5" />
      <span className="text-sm">{result.message ?? 'Invalid x402 response'}</span>
    </div>
  )
}

function MetadataPreview({
  metadata,
  suggestedTags,
  suggestedCategory,
  onUseMetadata,
}: {
  metadata?: ValidationResult['metadata']
  suggestedTags?: string[]
  suggestedCategory?: string
  onUseMetadata: (data: {
    name?: string
    description?: string
    tags?: string[]
    category?: string
  }) => void
}) {
  if (!metadata && !suggestedTags?.length) return null

  return (
    <Card className="bg-purple-50/50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          Auto-Detected Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {metadata?.title && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Title</p>
            <p className="text-sm font-medium">{metadata.title}</p>
          </div>
        )}

        {metadata?.description && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Description</p>
            <p className="text-sm">{metadata.description}</p>
          </div>
        )}

        {suggestedTags && suggestedTags.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Suggested Tags</p>
            <div className="flex flex-wrap gap-1">
              {suggestedTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {suggestedCategory && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Suggested Category</p>
            <Badge>{suggestedCategory}</Badge>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() =>
            onUseMetadata({
              name: metadata?.title,
              description: metadata?.description,
              tags: suggestedTags,
              category: suggestedCategory,
            })
          }
        >
          Use This Information
        </Button>
      </CardContent>
    </Card>
  )
}

// =====================================================
// MAIN PAGE
// =====================================================

const CATEGORIES = [
  'text-generation',
  'code-generation',
  'image-processing',
  'audio-processing',
  'video-processing',
  'data-analysis',
  'translation',
  'summarization',
  'search',
  'embedding',
  'classification',
  'other',
]

const POPULAR_TAGS = [
  'ai',
  'llm',
  'gpt',
  'image',
  'audio',
  'video',
  'code',
  'text',
  'api',
  'fast',
  'cheap',
  'enterprise',
]

export default function X402RegisterPage(): React.JSX.Element {
  const [form, setForm] = useState<RegistrationForm>({
    url: '',
    name: '',
    description: '',
    category: '',
    tags: [],
    customTag: '',
  })

  const [validation, setValidation] = useState<ValidationResult>({ status: 'idle' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<'success' | 'error' | null>(null)

  const validateUrl = useCallback(async (url: string) => {
    if (!url) {
      setValidation({ status: 'idle' })
      return
    }

    // Basic URL validation
    try {
      new URL(url)
    } catch {
      setValidation({ status: 'invalid', message: 'Invalid URL format' })
      return
    }

    setValidation({ status: 'validating' })

    // Simulate API call for validation
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Mock successful validation
    setValidation({
      status: 'valid',
      x402Response: {
        version: '1.0',
        accepts: [
          {
            network: 'solana',
            amount: '0.001 USDC',
            token: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            payTo: 'GHOSTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          },
        ],
      },
      metadata: {
        title: 'AI Text Generation API',
        description: 'Generate high-quality text using advanced AI models',
        favicon: '/favicon.ico',
      },
      suggestedTags: ['ai', 'text', 'llm', 'gpt'],
      suggestedCategory: 'text-generation',
    })
  }, [])

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value
      setForm((f) => ({ ...f, url }))

      // Debounce validation
      const timeout = setTimeout(() => validateUrl(url), 500)
      return () => clearTimeout(timeout)
    },
    [validateUrl]
  )

  const handleUseMetadata = useCallback(
    (data: { name?: string; description?: string; tags?: string[]; category?: string }) => {
      setForm((f) => ({
        ...f,
        name: data.name ?? f.name,
        description: data.description ?? f.description,
        tags: data.tags ?? f.tags,
        category: data.category ?? f.category,
      }))
    },
    []
  )

  const handleAddTag = useCallback(
    (tag: string) => {
      if (tag && !form.tags.includes(tag)) {
        setForm((f) => ({ ...f, tags: [...f.tags, tag], customTag: '' }))
      }
    },
    [form.tags]
  )

  const handleRemoveTag = useCallback((tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (validation.status !== 'valid') return

    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsSubmitting(false)
    setSubmitResult('success')
  }, [validation.status])

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-2 flex items-center gap-3">
            <Plus className="w-8 h-8" />
            Register x402 Resource
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Add your x402-enabled API to the ecosystem for discovery
          </p>
        </div>

        {submitResult === 'success' ? (
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Resource Registered!</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your resource has been added to the x402 ecosystem and will appear in search results
                shortly.
              </p>
              <div className="flex gap-3 justify-center">
                <Button asChild>
                  <a href="/x402/explorer">View in Explorer</a>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitResult(null)
                    setForm({
                      url: '',
                      name: '',
                      description: '',
                      category: '',
                      tags: [],
                      customTag: '',
                    })
                    setValidation({ status: 'idle' })
                  }}
                >
                  Register Another
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="md:col-span-2 space-y-6">
              <Card className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Resource URL</CardTitle>
                  <CardDescription>Enter the URL of your x402-enabled API endpoint</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="https://api.example.com/v1/generate"
                      className="pl-10"
                      value={form.url}
                      onChange={handleUrlChange}
                    />
                  </div>

                  <ValidationStatus result={validation} />
                </CardContent>
              </Card>

              {validation.status === 'valid' && (
                <>
                  <Card className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Resource Details</CardTitle>
                      <CardDescription>Provide information about your resource</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          placeholder="My AI API"
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Describe what your API does..."
                          rows={3}
                          value={form.description}
                          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={form.category}
                          onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c.replace('-', ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Tag className="w-5 h-5" />
                        Tags
                      </CardTitle>
                      <CardDescription>Add tags to help users find your resource</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {form.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            {tag}
                            <XCircle className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          placeholder="Add custom tag..."
                          value={form.customTag}
                          onChange={(e) => setForm((f) => ({ ...f, customTag: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddTag(form.customTag)
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          onClick={() => handleAddTag(form.customTag)}
                          disabled={!form.customTag}
                        >
                          Add
                        </Button>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-2">Popular tags:</p>
                        <div className="flex flex-wrap gap-1">
                          {POPULAR_TAGS.filter((t) => !form.tags.includes(t)).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/50"
                              onClick={() => handleAddTag(tag)}
                            >
                              + {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !form.name}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Register Resource
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {validation.status === 'valid' && (
                <MetadataPreview
                  metadata={validation.metadata}
                  suggestedTags={validation.suggestedTags}
                  suggestedCategory={validation.suggestedCategory}
                  onUseMetadata={handleUseMetadata}
                />
              )}

              <Card className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Returns HTTP 402 without payment</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Valid x402 JSON response body</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>Includes accepts array with payment options</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <DollarSign className="w-4 h-4 text-purple-500 mt-0.5" />
                    <span>USDC payments on supported networks</span>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Verification</AlertTitle>
                <AlertDescription className="text-sm">
                  After registration, your resource will be periodically pinged to verify
                  availability and update metrics.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
