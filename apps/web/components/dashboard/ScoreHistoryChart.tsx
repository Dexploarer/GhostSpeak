'use client'

/**
 * ScoreHistoryChart
 * Line chart showing Ghost Score trends over time with tier threshold bands
 */

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts'

interface ScoreHistoryChartProps {
  agentAddress: string
  days?: number
  height?: number
}

// Tier thresholds for reference lines
const TIER_THRESHOLDS = [
  { value: 2000, label: 'BRONZE', color: '#CD7F32' },
  { value: 5000, label: 'SILVER', color: '#C0C0C0' },
  { value: 7500, label: 'GOLD', color: '#FFD700' },
  { value: 9000, label: 'PLATINUM', color: '#E5E4E2' },
  { value: 9500, label: 'DIAMOND', color: '#B9F2FF' },
]

export function ScoreHistoryChart({
  agentAddress,
  days = 30,
  height = 300,
}: ScoreHistoryChartProps) {
  const history = useQuery(api.ghostScoreHistory.getScoreHistory, {
    agentAddress,
    days,
    limit: 100,
  })

  const stats = useQuery(api.ghostScoreHistory.getScoreStats, {
    agentAddress,
  })

  if (!history) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-zinc-900/50"
        style={{ height }}
      >
        <div className="animate-pulse text-zinc-500">Loading history...</div>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50"
        style={{ height }}
      >
        <span className="text-xl">📊</span>
        <span className="mt-2 text-sm text-zinc-500">No history data yet</span>
        <span className="text-xs text-zinc-600">Score snapshots appear daily</span>
      </div>
    )
  }

  // Format data for chart
  const chartData = history.map((h) => ({
    date: h.date,
    score: h.score,
    tier: h.tier,
  }))

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-300">Ghost Score History</h3>
        {stats && (
          <div className="flex items-center gap-4 text-xs">
            <span className="text-zinc-500">
              High: <span className="text-lime-400">{stats.highScore}</span>
            </span>
            <span className="text-zinc-500">
              Low: <span className="text-red-400">{stats.lowScore}</span>
            </span>
            <span className="text-zinc-500">
              Trend:{' '}
              <span
                className={
                  stats.trend === 'up'
                    ? 'text-lime-400'
                    : stats.trend === 'down'
                      ? 'text-red-400'
                      : 'text-zinc-400'
                }
              >
                {stats.trend === 'up' ? '↑' : stats.trend === 'down' ? '↓' : '→'}
              </span>
            </span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height - 60}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a3e635" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#a3e635" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="date"
            stroke="#52525b"
            fontSize={10}
            tickFormatter={(v) => {
              const d = new Date(v)
              return `${d.getMonth() + 1}/${d.getDate()}`
            }}
          />
          <YAxis stroke="#52525b" fontSize={10} domain={[0, 10000]} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#a1a1aa' }}
            formatter={(value) => [
              typeof value === 'number' ? value.toLocaleString() : '',
              'Score',
            ]}
          />

          {/* Tier threshold reference lines */}
          {TIER_THRESHOLDS.map((tier) => (
            <ReferenceLine
              key={tier.label}
              y={tier.value}
              stroke={tier.color}
              strokeDasharray="5 5"
              strokeOpacity={0.4}
            />
          ))}

          <Area type="monotone" dataKey="score" fill="url(#scoreGradient)" stroke="none" />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#a3e635"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#a3e635' }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Time range selector */}
      <div className="mt-3 flex justify-center gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            className={`rounded px-2 py-1 text-xs ${
              days === d ? 'bg-lime-500/20 text-lime-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {d}d
          </button>
        ))}
      </div>
    </div>
  )
}
