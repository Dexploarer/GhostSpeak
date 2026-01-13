'use client'

/**
 * ScoreHistoryCard
 * Chat UI component for displaying Ghost Score history inline
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from 'recharts'

interface ScoreHistoryCardProps {
  agentAddress: string
  days: number
  history: Array<{
    score: number
    tier: string
    date: string
    timestamp: number
  }>
  stats?: {
    currentScore: number
    highScore: number
    lowScore: number
    avgScore: number
    trend: 'up' | 'down' | 'stable'
    totalSnapshots: number
  } | null
  onActionClick?: (prompt: string) => void
}

const TIER_THRESHOLDS = [
  { value: 2000, label: 'BRONZE', color: '#CD7F32' },
  { value: 5000, label: 'SILVER', color: '#C0C0C0' },
  { value: 7500, label: 'GOLD', color: '#FFD700' },
  { value: 9000, label: 'PLATINUM', color: '#E5E4E2' },
]

export function ScoreHistoryCard({
  agentAddress,
  days,
  history,
  stats,
  onActionClick,
}: ScoreHistoryCardProps) {
  const trendEmoji = stats?.trend === 'up' ? '📈' : stats?.trend === 'down' ? '📉' : '➡️'
  const trendColor =
    stats?.trend === 'up'
      ? 'text-lime-400'
      : stats?.trend === 'down'
        ? 'text-red-400'
        : 'text-zinc-400'

  // Format data for chart
  const chartData = history.map((h: any) => ({
    date: h.date,
    score: h.score,
  }))

  return (
    <div className="w-full max-w-lg rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <span className="text-sm font-medium text-zinc-300">Score History</span>
        </div>
        <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">{days}d</span>
      </div>

      {/* Agent address */}
      <div className="mb-3 font-mono text-xs text-zinc-500">
        {agentAddress.slice(0, 8)}...{agentAddress.slice(-4)}
      </div>

      {/* Stats row */}
      {stats && (
        <div className="mb-4 grid grid-cols-4 gap-2 text-center">
          <div className="rounded bg-zinc-900/50 p-2">
            <div className="text-xs text-zinc-500">Current</div>
            <div className="font-medium text-zinc-200">{stats.currentScore}</div>
          </div>
          <div className="rounded bg-zinc-900/50 p-2">
            <div className="text-xs text-zinc-500">High</div>
            <div className="font-medium text-lime-400">{stats.highScore}</div>
          </div>
          <div className="rounded bg-zinc-900/50 p-2">
            <div className="text-xs text-zinc-500">Low</div>
            <div className="font-medium text-red-400">{stats.lowScore}</div>
          </div>
          <div className="rounded bg-zinc-900/50 p-2">
            <div className="text-xs text-zinc-500">Trend</div>
            <div className={`font-medium ${trendColor}`}>{trendEmoji}</div>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="mb-4 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <XAxis
                dataKey="date"
                stroke="#52525b"
                fontSize={9}
                tickFormatter={(v) => {
                  const d = new Date(v)
                  return `${d.getMonth() + 1}/${d.getDate()}`
                }}
              />
              <YAxis stroke="#52525b" fontSize={9} domain={[0, 10000]} hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '6px',
                  fontSize: '11px',
                }}
              />
              {TIER_THRESHOLDS.map((tier: any) => (
                <ReferenceLine
                  key={tier.label}
                  y={tier.value}
                  stroke={tier.color}
                  strokeDasharray="3 3"
                  strokeOpacity={0.3}
                />
              ))}
              <Line
                type="monotone"
                dataKey="score"
                stroke="#a3e635"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: '#a3e635' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onActionClick?.(`Check the current ghost score for ${agentAddress}`)}
          className="rounded-full bg-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-600"
        >
          Current Score
        </button>
        <button
          onClick={() => onActionClick?.(`Run a trust assessment on ${agentAddress}`)}
          className="rounded-full bg-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-600"
        >
          Trust Check
        </button>
        <button
          onClick={() => onActionClick?.(`Any fraud signals on ${agentAddress}?`)}
          className="rounded-full bg-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-600"
        >
          Fraud Signals
        </button>
      </div>
    </div>
  )
}
