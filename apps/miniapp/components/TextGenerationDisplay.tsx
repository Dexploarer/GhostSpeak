'use client'

import { useState } from 'react'
import { Copy, Check, AlertCircle } from 'lucide-react'
import type {
  GenerateThreadResponse,
  GeneratePostResponse,
  GenerateRaidResponse,
  RaidPackage,
} from '@/lib/types'

/**
 * Props for TextGenerationDisplay component
 */
interface TextGenerationDisplayProps {
  type: 'thread' | 'post' | 'raid_package'
  metadata:
    | GenerateThreadResponse['metadata']
    | GeneratePostResponse['metadata']
    | GenerateRaidResponse['metadata']
  onCopyComplete?: () => void
}

/**
 * Get character count color class
 */
function getCharCountColor(count: number): string {
  if (count > 280) return 'text-red-600'
  if (count > 240) return 'text-yellow-600'
  return 'text-green-600'
}

/**
 * Get character count status emoji
 */
function getCharCountStatus(count: number): string {
  if (count > 280) return '⚠️'
  if (count > 240) return '⚡'
  return '✅'
}

/**
 * Copy to clipboard with visual feedback
 */
function useCopyToClipboard() {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
      return true
    } catch (error) {
      console.error('Failed to copy:', error)
      return false
    }
  }

  return { copyText, copiedId }
}

/**
 * Thread Display Component
 */
function ThreadDisplay({ metadata }: { metadata: Extract<TextGenerationDisplayProps['metadata'], { type: 'thread' }> }) {
  const { copyText, copiedId } = useCopyToClipboard()
  const tweets = metadata?.tweets || []
  const stats = metadata?.threadStats

  const copyAll = () => {
    const allTweets = tweets.map((tweet, i) => `${i + 1}/${tweets.length}: ${tweet}`).join('\n\n')
    copyText(allTweets, 'all-tweets')
  }

  if (tweets.length === 0) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">No tweets generated</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">Thread Generated</h3>
          <p className="text-sm text-muted-foreground">
            {tweets.length} tweets • {metadata?.template} template
          </p>
        </div>
        <button
          onClick={copyAll}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          aria-label="Copy entire thread"
        >
          {copiedId === 'all-tweets' ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy All
            </>
          )}
        </button>
      </div>

      {/* Tweets */}
      <div className="space-y-3">
        {tweets.map((tweet, index) => {
          const charCount = tweet.length
          const tweetId = `tweet-${index}`

          return (
            <div
              key={index}
              className="rounded-lg border border-border bg-card p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary">
                      TWEET {index + 1}/{tweets.length}
                    </span>
                    <span className={`text-xs font-mono ${getCharCountColor(charCount)}`}>
                      {charCount}/280 {getCharCountStatus(charCount)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {tweet}
                  </p>
                </div>
                <button
                  onClick={() => copyText(tweet, tweetId)}
                  className="flex items-center gap-1 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80"
                  aria-label={`Copy tweet ${index + 1}`}
                >
                  {copiedId === tweetId ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              {charCount > 280 && (
                <div className="flex items-start gap-2 rounded-md bg-red-500/10 p-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-600">
                    Over limit by {charCount - 280} characters. Edit before posting.
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Stats */}
      {stats && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h4 className="mb-2 text-sm font-semibold text-foreground">Thread Stats</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Total Tweets:</span>{' '}
              <span className="font-medium text-foreground">{stats.tweetCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Avg Chars:</span>{' '}
              <span className="font-medium text-foreground">{stats.avgCharsPerTweet}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Hashtags:</span>{' '}
              <span className="font-medium text-foreground">{stats.hashtags.join(', ')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Post Display Component
 */
function PostDisplay({ metadata }: { metadata: Extract<TextGenerationDisplayProps['metadata'], { type: 'post' }> }) {
  const { copyText, copiedId } = useCopyToClipboard()
  const posts = metadata?.posts || []
  const stats = metadata?.postStats

  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">No posts generated</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-foreground">Post Variations</h3>
        <p className="text-sm text-muted-foreground">
          {posts.length} variations • {metadata?.template} template
        </p>
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {posts.map((post, index) => {
          const charCount = post.length
          const postId = `post-${index}`

          return (
            <div
              key={index}
              className="rounded-lg border border-border bg-card p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary">
                      VARIATION {index + 1}/{posts.length}
                    </span>
                    <span className={`text-xs font-mono ${getCharCountColor(charCount)}`}>
                      {charCount}/280 {getCharCountStatus(charCount)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {post}
                  </p>
                </div>
                <button
                  onClick={() => copyText(post, postId)}
                  className="flex items-center gap-1 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80"
                  aria-label={`Copy variation ${index + 1}`}
                >
                  {copiedId === postId ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              {charCount > 280 && (
                <div className="flex items-start gap-2 rounded-md bg-red-500/10 p-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-600">
                    Over limit by {charCount - 280} characters. Edit before posting.
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Stats */}
      {stats && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h4 className="mb-2 text-sm font-semibold text-foreground">Post Stats</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Variations:</span>{' '}
              <span className="font-medium text-foreground">{stats.variationCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Avg Chars:</span>{' '}
              <span className="font-medium text-foreground">{stats.avgCharsPerPost}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Shortest:</span>{' '}
              <span className="font-medium text-foreground">{stats.shortest} chars</span>
            </div>
            <div>
              <span className="text-muted-foreground">Longest:</span>{' '}
              <span className="font-medium text-foreground">{stats.longest} chars</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Raid Package Display Component
 */
function RaidPackageDisplay({ metadata }: { metadata: Extract<TextGenerationDisplayProps['metadata'], { type: 'raid_package' }> }) {
  const { copyText, copiedId } = useCopyToClipboard()
  const [activeTab, setActiveTab] = useState<'thread' | 'quotes' | 'posts' | 'strategy'>('thread')
  const raidPackage = metadata?.package as RaidPackage

  if (!raidPackage) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">No raid package generated</p>
      </div>
    )
  }

  const tabs = [
    { id: 'thread', label: 'Main Thread', count: raidPackage.mainThread.length },
    { id: 'quotes', label: 'Quote Tweets', count: raidPackage.quoteTweets.length },
    { id: 'posts', label: 'Standalone', count: raidPackage.standalonePosts.length },
    { id: 'strategy', label: 'Strategy', count: null },
  ] as const

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-foreground">Raid Package 🚀</h3>
        <p className="text-sm text-muted-foreground">
          {metadata?.raidType} raid • Complete coordinated package
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label={`View ${tab.label}`}
            aria-pressed={activeTab === tab.id}
          >
            {tab.label}
            {tab.count !== null && (
              <span className="ml-1 opacity-70">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-3">
        {/* Main Thread */}
        {activeTab === 'thread' && (
          <>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Main Raid Thread</h4>
              <button
                onClick={() => {
                  const allTweets = raidPackage.mainThread.map((tweet, i) => `${i + 1}/${raidPackage.mainThread.length}: ${tweet}`).join('\n\n')
                  copyText(allTweets, 'main-thread-all')
                }}
                className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
              >
                {copiedId === 'main-thread-all' ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy All
                  </>
                )}
              </button>
            </div>
            {raidPackage.mainThread.map((tweet, index) => {
              const charCount = tweet.length
              const tweetId = `main-${index}`

              return (
                <div key={index} className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary">
                          {index + 1}/{raidPackage.mainThread.length}
                        </span>
                        <span className={`text-xs font-mono ${getCharCountColor(charCount)}`}>
                          {charCount}/280 {getCharCountStatus(charCount)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{tweet}</p>
                    </div>
                    <button
                      onClick={() => copyText(tweet, tweetId)}
                      className="flex items-center gap-1 rounded-md bg-muted px-3 py-1.5 text-xs font-medium"
                    >
                      {copiedId === tweetId ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* Quote Tweets */}
        {activeTab === 'quotes' && (
          <>
            <h4 className="text-sm font-semibold text-foreground">Quote Tweets (for community)</h4>
            <p className="text-xs text-muted-foreground">Community members can quote tweet the main thread with these</p>
            {raidPackage.quoteTweets.map((quote, index) => {
              const charCount = quote.length
              const quoteId = `quote-${index}`

              return (
                <div key={index} className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary">
                          QUOTE {index + 1}/{raidPackage.quoteTweets.length}
                        </span>
                        <span className={`text-xs font-mono ${getCharCountColor(charCount)}`}>
                          {charCount}/280 {getCharCountStatus(charCount)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{quote}</p>
                    </div>
                    <button
                      onClick={() => copyText(quote, quoteId)}
                      className="flex items-center gap-1 rounded-md bg-muted px-3 py-1.5 text-xs font-medium"
                    >
                      {copiedId === quoteId ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* Standalone Posts */}
        {activeTab === 'posts' && (
          <>
            <h4 className="text-sm font-semibold text-foreground">Standalone Posts</h4>
            <p className="text-xs text-muted-foreground">Use these for additional visibility throughout the day</p>
            {raidPackage.standalonePosts.map((post, index) => {
              const charCount = post.length
              const postId = `standalone-${index}`

              return (
                <div key={index} className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary">
                          POST {index + 1}/{raidPackage.standalonePosts.length}
                        </span>
                        <span className={`text-xs font-mono ${getCharCountColor(charCount)}`}>
                          {charCount}/280 {getCharCountStatus(charCount)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{post}</p>
                    </div>
                    <button
                      onClick={() => copyText(post, postId)}
                      className="flex items-center gap-1 rounded-md bg-muted px-3 py-1.5 text-xs font-medium"
                    >
                      {copiedId === postId ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* Strategy */}
        {activeTab === 'strategy' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary bg-primary/5 p-4">
              <h4 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                🎯 Call to Action
              </h4>
              <p className="text-sm text-foreground">{raidPackage.callToAction}</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                🏷️ Hashtags
              </h4>
              <p className="text-sm text-foreground">{raidPackage.hashtags.join(', ')}</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                ⏰ Best Timing
              </h4>
              <p className="text-sm text-foreground">{raidPackage.timing}</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
                🚀 Execution Plan
              </h4>
              <p className="text-sm text-foreground whitespace-pre-wrap">{raidPackage.strategy}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Main TextGenerationDisplay Component
 */
export function TextGenerationDisplay({
  type,
  metadata,
  onCopyComplete,
}: TextGenerationDisplayProps) {
  if (!metadata) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-sm text-destructive">No content to display</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 shadow-md">
      {type === 'thread' && metadata.type === 'thread' && (
        <ThreadDisplay metadata={metadata} />
      )}
      {type === 'post' && metadata.type === 'post' && (
        <PostDisplay metadata={metadata} />
      )}
      {type === 'raid_package' && metadata.type === 'raid_package' && (
        <RaidPackageDisplay metadata={metadata} />
      )}
    </div>
  )
}
