'use client'

/**
 * AgentComparisonView
 * Multi-agent score comparison with overlaid line charts
 */

import { useState } from 'react'
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
  Legend,
} from 'recharts'

interface AgentComparisonViewProps {
  initialAgents?: string[]
  days?: number
  height?: number
}

// Distinct colors for comparison lines
const AGENT_COLORS = ['#a3e635', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

export function AgentComparisonView({
  initialAgents = [],
  days = 30,
  height = 350,
}: AgentComparisonViewProps) {
  const [agents, setAgents] = useState<string[]>(initialAgents)
  const [newAddress, setNewAddress] = useState('')

  const comparison = useQuery(
    api.ghostScoreHistory.compareAgents,
    agents.length > 0 ? { agentAddresses: agents, days } : 'skip'
  )

  const handleAddAgent = () => {
    if (newAddress && !agents.includes(newAddress) && agents.length < 5) {
      setAgents([...agents, newAddress])
      setNewAddress('')
    }
  }

  const handleRemoveAgent = (address: string) => {
    setAgents(agents.filter((a) => a !== address))
  }

  // Merge data for chart (align by date)
  const mergedData: Array<Record<string, number | string>> = []
  if (comparison && !('error' in comparison)) {
    // Collect all unique dates
    const allDates = new Set<string>()
    Object.values(comparison).forEach((history) => {
      history.forEach((h) => allDates.add(h.date))
    })

    // Build merged data
    Array.from(allDates)
      .sort()
      .forEach((date) => {
        const point: Record<string, number | string> = { date }
        Object.entries(comparison).forEach(([address, history]) => {
          const entry = history.find((h) => h.date === date)
          if (entry) {
            point[address] = entry.score
          }
        })
        mergedData.push(point)
      })
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-zinc-300">Agent Comparison</h3>
        <p className="text-xs text-zinc-500">Compare Ghost Scores across multiple agents</p>
      </div>

      {/* Agent selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {agents.map((address, i) => (
          <div
            key={address}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-xs"
            style={{ backgroundColor: `${AGENT_COLORS[i]}20`, color: AGENT_COLORS[i] }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: AGENT_COLORS[i] }} />
            <span className="font-mono">{`${address.slice(0, 4)}...${address.slice(-4)}`}</span>
            <button onClick={() => handleRemoveAgent(address)} className="ml-1 hover:opacity-70">
              ×
            </button>
          </div>
        ))}
        {agents.length < 5 && (
          <div className="flex gap-1">
            <input
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Add agent address..."
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-lime-500 focus:outline-none"
            />
            <button
              onClick={handleAddAgent}
              className="rounded bg-lime-500/20 px-2 py-1 text-xs text-lime-400 hover:bg-lime-500/30"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Chart */}
      {agents.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-700"
          style={{ height: height - 100 }}
        >
          <span className="text-xl">📈</span>
          <span className="mt-2 text-sm text-zinc-500">Add agents to compare</span>
        </div>
      ) : mergedData.length === 0 ? (
        <div
          className="flex items-center justify-center rounded-lg bg-zinc-900/50"
          style={{ height: height - 100 }}
        >
          <div className="animate-pulse text-zinc-500">Loading comparison...</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height - 100}>
          <LineChart data={mergedData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
            />
            <Legend
              formatter={(value: string) => (
                <span className="font-mono text-xs">{`${value.slice(0, 4)}...${value.slice(-4)}`}</span>
              )}
            />

            {agents.map((address, i) => (
              <Line
                key={address}
                type="monotone"
                dataKey={address}
                stroke={AGENT_COLORS[i]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: AGENT_COLORS[i] }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
