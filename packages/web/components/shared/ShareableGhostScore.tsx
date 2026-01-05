'use client'

import { useState } from 'react'
import { Share2, Twitter, Copy, Check, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { GhostIcon } from './GhostIcon'

interface ShareableGhostScoreProps {
  score: number
  tier: string
  agentName: string
  agentAddress: string
  compact?: boolean
}

/**
 * Get tier color based on Ghost Score tier
 */
function getTierColor(tier: string): string {
  switch (tier.toUpperCase()) {
    case 'PLATINUM':
      return 'from-purple-500 to-blue-500'
    case 'GOLD':
      return 'from-yellow-400 to-orange-500'
    case 'SILVER':
      return 'from-gray-300 to-gray-500'
    case 'BRONZE':
      return 'from-amber-600 to-amber-800'
    default:
      return 'from-gray-400 to-gray-600'
  }
}

/**
 * ShareableGhostScore - A card that displays Ghost Score with share options
 *
 * Features:
 * - Visual Ghost Score card with tier colors
 * - Share to Twitter/X
 * - Copy embed code
 * - Copy link to profile
 *
 * Viral growth hook: Users can share their reputation to attract others
 */
export function ShareableGhostScore({
  score,
  tier,
  agentName,
  agentAddress,
  compact = false,
}: ShareableGhostScoreProps) {
  const [copied, setCopied] = useState<'link' | 'embed' | null>(null)

  const profileUrl = `https://ghostspeak.io/agent/${agentAddress}`
  const twitterText = `My AI agent "${agentName}" just hit a Ghost Score of ${score.toLocaleString()}/10,000 (${tier}) on @GhostSpeakIO!

On-chain reputation for AI agents.

${profileUrl}`

  const embedCode = `<iframe src="${profileUrl}/embed" width="400" height="200" frameborder="0" title="Ghost Score"></iframe>`

  const handleCopy = async (type: 'link' | 'embed') => {
    const text = type === 'link' ? profileUrl : embedCode
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border">
        <GhostIcon variant="solid" size={16} className="text-primary" />
        <span className="text-sm font-bold">{score.toLocaleString()}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded-full bg-gradient-to-r ${getTierColor(tier)} text-white font-medium`}>
          {tier}
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <button className="p-1 hover:bg-primary/10 rounded transition-colors">
              <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="end">
            <div className="space-y-1">
              <button
                onClick={handleTwitterShare}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-primary/10 rounded transition-colors"
              >
                <Twitter className="w-4 h-4" />
                Share on X
              </button>
              <button
                onClick={() => handleCopy('link')}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-primary/10 rounded transition-colors"
              >
                {copied === 'link' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                Copy link
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-6">
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getTierColor(tier)} opacity-5`} />

      {/* Ghost watermark */}
      <div className="absolute -bottom-4 -right-4 opacity-5">
        <GhostIcon variant="outline" size={120} className="text-foreground" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <GhostIcon variant="brain" size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{agentName}</h3>
              <p className="text-xs text-muted-foreground font-mono">
                {agentAddress.slice(0, 4)}...{agentAddress.slice(-4)}
              </p>
            </div>
          </div>

          {/* Share button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Share2 className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium mb-2">Share your reputation</p>

                <button
                  onClick={handleTwitterShare}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                  Share on X / Twitter
                  <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                </button>

                <button
                  onClick={() => handleCopy('link')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-primary/10 rounded-lg transition-colors"
                >
                  {copied === 'link' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied === 'link' ? 'Copied!' : 'Copy profile link'}
                </button>

                <button
                  onClick={() => handleCopy('embed')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-primary/10 rounded-lg transition-colors"
                >
                  {copied === 'embed' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied === 'embed' ? 'Copied!' : 'Copy embed code'}
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Score display */}
        <div className="text-center py-4">
          <div className="text-5xl font-black tracking-tight mb-2">
            {score.toLocaleString()}
            <span className="text-lg text-muted-foreground font-normal">/10,000</span>
          </div>
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r ${getTierColor(tier)} text-white text-sm font-bold shadow-lg`}>
            <GhostIcon variant="solid" size={14} className="text-white" />
            {tier}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
          <GhostIcon variant="outline" size={12} className="text-primary" />
          Verified on GhostSpeak
        </div>
      </div>
    </div>
  )
}

/**
 * Landing page CTA variant - encourages users to get their own score
 */
export function ShareScoreCTA() {
  return (
    <div className="text-center py-8">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-4">
        <Share2 className="w-4 h-4" />
        Flex your reputation
      </div>
      <h3 className="text-2xl font-bold mb-2">Share Your Ghost Score</h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">
        Show off your AI agent&apos;s on-chain reputation. Share to Twitter, embed on your site, or link in your bio.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" className="gap-2">
          <Twitter className="w-4 h-4" />
          Share on X
        </Button>
        <Button variant="outline" className="gap-2">
          <Copy className="w-4 h-4" />
          Copy Embed
        </Button>
      </div>
    </div>
  )
}
