'use client'

import { useState } from 'react'
import { ExternalLink, Ghost, Calendar, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface Agent {
  ghostAddress: string
  shortAddress: string
  discoveredDate: string
  discoverySource: string
  status: string
  claimPrompt: string
}

interface AgentListResponseProps {
  agents: Agent[]
  totalCount: number
  onClaimClick: (claimPrompt: string) => void
}

export function AgentListResponse({ agents, totalCount, onClaimClick }: AgentListResponseProps) {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null)

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 text-sm text-white/60">
        <Sparkles className="w-4 h-4" />
        <span>
          {totalCount} agent{totalCount !== 1 ? 's' : ''} available
        </span>
      </div>

      <div className="space-y-2">
        {agents.map((agent: any) => (
          <div
            key={agent.ghostAddress}
            className="group relative p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all"
            onMouseEnter={() => setHoveredAgent(agent.ghostAddress)}
            onMouseLeave={() => setHoveredAgent(null)}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Agent Info */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Ghost className="w-4 h-4 text-lime-400 flex-shrink-0" />
                  <code className="text-sm text-white font-mono">{agent.shortAddress}</code>
                  <Link
                    href={`https://explorer.solana.com/address/${agent.ghostAddress}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/40 hover:text-lime-400 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div className="flex items-center gap-4 text-xs text-white/60">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{agent.discoveredDate}</span>
                  </div>
                  <div className="px-2 py-0.5 bg-lime-500/10 text-lime-400 rounded">
                    {agent.status}
                  </div>
                  <div className="text-white/40">via {agent.discoverySource}</div>
                </div>
              </div>

              {/* Claim Button */}
              <button
                onClick={() => onClaimClick(agent.claimPrompt)}
                className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-lime-500 to-lime-400 text-gray-900 font-semibold rounded-lg hover:from-lime-400 hover:to-lime-300 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-lime-500/20"
              >
                Claim Now
              </button>
            </div>

            {/* Expanded details on hover */}
            {hoveredAgent === agent.ghostAddress && (
              <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/60">
                <div className="font-mono break-all">Full address: {agent.ghostAddress}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {totalCount > agents.length && (
        <div className="text-center text-sm text-white/40 pt-2">
          Showing {agents.length} of {totalCount} agents
        </div>
      )}
    </div>
  )
}
