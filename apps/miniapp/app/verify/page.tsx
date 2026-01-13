'use client'

import { useState } from 'react'
import { useTelegram } from '@/components/providers/TelegramProvider'
import { Search, Loader2, Shield, Star, TrendingUp, Award } from 'lucide-react'
import { ErrorBoundary } from '@/components/error-boundary'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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

  // Fetch score history when we have a result
  const scoreHistory = useQuery(
    api.ghostScoreHistory.getScoreHistory,
    result ? { agentAddress: result.address, days: 30, limit: 30 } : 'skip'
  )

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setError(null)
    setResult(null)

    try {
      // Import api-client dynamically to avoid build issues
      const { getAgentScore } = await import('@/lib/api-client')

      const data = await getAgentScore(searchQuery.trim())

      // Transform API response to local format
      const mockScore: AgentScore = {
        address: searchQuery.trim(),
        score: data.score,
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
    <ErrorBoundary>
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
              aria-label="Solana wallet address to search"
              aria-describedby="search-hint"
              className="flex-1 rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span id="search-hint" className="sr-only">Enter a valid Solana wallet address to check the agent&apos;s Ghost Score and reputation</span>
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              aria-label={isSearching ? 'Searching for agent, please wait' : 'Search for agent by Solana address'}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {isSearching ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="h-5 w-5" aria-hidden="true" />
              )}
              <span className="sr-only">{isSearching ? 'Searching' : 'Search'}</span>
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
                <div className="flex-1">
                  <h3 className="mb-1 text-lg font-semibold text-card-foreground">
                    Ghost Score
                  </h3>
                  <p className="text-xs font-mono text-muted-foreground">
                    {result.address.slice(0, 8)}...{result.address.slice(-6)}
                  </p>
                  {scoreHistory && scoreHistory.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {scoreHistory[0]?.timestamp ? new Date(scoreHistory[0].timestamp).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  )}
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

            {/* 30-Day Score Trend Chart */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold text-card-foreground">
                  30-Day Score Trend
                </h3>
              </div>

              {scoreHistory === undefined ? (
                <div className="h-48 animate-pulse rounded-lg bg-muted" />
              ) : !scoreHistory || scoreHistory.length < 2 ? (
                <div className="flex h-48 items-center justify-center rounded-lg bg-muted/50">
                  <div className="text-center">
                    <div className="mb-2 text-3xl">📊</div>
                    <p className="text-xs text-muted-foreground">
                      Not enough history data yet
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={scoreHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(date) => {
                          const d = new Date(date)
                          return `${d.getMonth() + 1}/${d.getDate()}`
                        }}
                      />
                      <YAxis
                        domain={[0, 1000]}
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: number | undefined) => [`${value ?? 0}`, 'Score']}
                        labelFormatter={(label) => {
                          const d = new Date(label)
                          return d.toLocaleDateString()
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke={
                          scoreHistory[scoreHistory.length - 1].score >= scoreHistory[0].score
                            ? 'hsl(142, 76%, 36%)'
                            : 'hsl(0, 84%, 60%)'
                        }
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Start: {scoreHistory[0]?.score || 0}
                    </span>
                    <span>
                      {scoreHistory[scoreHistory.length - 1].score >= scoreHistory[0].score ? (
                        <span className="text-green-600">
                          +{scoreHistory[scoreHistory.length - 1].score - scoreHistory[0].score} points
                        </span>
                      ) : (
                        <span className="text-red-600">
                          {scoreHistory[scoreHistory.length - 1].score - scoreHistory[0].score} points
                        </span>
                      )}
                    </span>
                    <span>
                      Current: {scoreHistory[scoreHistory.length - 1]?.score || 0}
                    </span>
                  </div>
                </>
              )}
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
    </ErrorBoundary>
  )
}
