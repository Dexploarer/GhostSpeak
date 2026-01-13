'use client'

import { useState } from 'react'
import { useTelegram } from '@/components/providers/TelegramProvider'
import { Search, Loader2, Shield, Star, TrendingUp, Award } from 'lucide-react'

interface AgentScore {
  address: string
  score: number
  tier: string
  badges: string[]
}

export default function VerifyPage() {
  const { firstName, username } = useTelegram()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [result, setResult] = useState<AgentScore | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setError(null)
    setResult(null)

    try {
      // Call the GhostSpeak API to get agent score
      const response = await fetch(
        `https://www.ghostspeak.io/api/v1/agent/${searchQuery.trim()}`
      )

      if (!response.ok) {
        throw new Error('Agent not found')
      }

      const data = await response.json()

      // Mock score calculation for now
      // In production, this would come from the API
      const mockScore: AgentScore = {
        address: searchQuery.trim(),
        score: Math.floor(Math.random() * 1000),
        tier: 'Emerging',
        badges: ['Verified', 'Active'],
      }

      setResult(mockScore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agent data')
    } finally {
      setIsSearching(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 800) return 'text-primary'
    if (score >= 600) return 'text-blue-500'
    if (score >= 400) return 'text-yellow-500'
    return 'text-orange-500'
  }

  const getScoreTier = (score: number) => {
    if (score >= 800) return '👻 Legendary'
    if (score >= 600) return '⭐ Established'
    if (score >= 400) return '🌟 Growing'
    return '🔰 Emerging'
  }

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="rounded-lg bg-primary p-6 shadow-lg">
          <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold text-primary-foreground drop-shadow-sm">
            <span className="text-3xl">👻</span> Caisper
          </h1>
          <p className="text-sm text-primary-foreground/90">
            Your AI trust detective - verify agents and check Ghost Scores
          </p>
        </div>

        {/* Search Bar */}
        <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 shadow-md">
          <label className="mb-2 block text-sm font-medium text-card-foreground">
            Search Agent
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter Solana address..."
              className="flex-1 rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSearching ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            {/* Score Card */}
            <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 shadow-md">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-card-foreground">
                    Ghost Score
                  </h3>
                  <p className="text-xs font-mono text-muted-foreground">
                    {result.address.slice(0, 8)}...{result.address.slice(-6)}
                  </p>
                </div>
                <Shield className="h-6 w-6 text-primary" />
              </div>

              {/* Score Display */}
              <div className="mb-4 text-center">
                <div className={`text-6xl font-bold ${getScoreColor(result.score)}`}>
                  {result.score}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {getScoreTier(result.score)}
                </div>
              </div>

              {/* Score Bar */}
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(result.score / 1000) * 100}%` }}
                />
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {result.badges.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
                  >
                    <Award className="h-3 w-3" />
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted p-4 text-center">
                <Star className="mx-auto mb-2 h-5 w-5 text-primary" />
                <div className="text-xs text-muted-foreground">Reputation</div>
                <div className="mt-1 font-semibold text-foreground">
                  {result.tier}
                </div>
              </div>
              <div className="rounded-lg bg-muted p-4 text-center">
                <TrendingUp className="mx-auto mb-2 h-5 w-5 text-primary" />
                <div className="text-xs text-muted-foreground">Trend</div>
                <div className="mt-1 font-semibold text-foreground">+12%</div>
              </div>
              <div className="rounded-lg bg-muted p-4 text-center">
                <Shield className="mx-auto mb-2 h-5 w-5 text-primary" />
                <div className="text-xs text-muted-foreground">Trust</div>
                <div className="mt-1 font-semibold text-foreground">High</div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!result && !error && (
          <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-8 text-center">
            <div className="mb-4 text-6xl">🔍</div>
            <h3 className="mb-2 text-lg font-semibold text-card-foreground">
              Search for an Agent
            </h3>
            <p className="text-sm text-muted-foreground">
              Enter a Solana address to view Ghost Score and credentials
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
