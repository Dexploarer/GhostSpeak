/**
 * Agent Directory Card Component
 *
 * Displays the agent directory with endpoints, categories, and capabilities
 */

import { Globe, Server, DollarSign, BarChart3, Zap } from 'lucide-react'

interface EndpointInfo {
  endpoint: string
  baseUrl: string
  method: string
  priceUsdc: number
  description: string
  category: string
  totalTests?: number
  successRate?: number
  avgQualityScore?: number
}

interface AgentDirectoryEntry {
  ghostAddress: string
  shortAddress: string
  status: string
  discoverySource: string
  discoveredDate: string
  claimedBy?: string
  endpoints: EndpointInfo[]
  categories: string[]
  totalEndpoints: number
  avgPriceUsdc?: number
  avgQualityScore?: number
  ghostScorePrompt: string
  vibeCheckPrompt: string
}

interface AgentDirectoryCardProps {
  agents: AgentDirectoryEntry[]
  totalAgents: number
  totalEndpoints: number
  agentsWithEndpoints: number
  onActionClick?: (prompt: string) => void
}

export function AgentDirectoryCard({
  agents,
  totalAgents,
  totalEndpoints,
  agentsWithEndpoints,
  onActionClick,
}: AgentDirectoryCardProps) {
  const getQualityBadge = (score?: number) => {
    if (!score) return { color: 'bg-white/20', text: 'N/A' }
    if (score >= 80) return { color: 'bg-emerald-500/30 text-emerald-300', text: 'High' }
    if (score >= 50) return { color: 'bg-amber-500/30 text-amber-300', text: 'Medium' }
    return { color: 'bg-red-500/30 text-red-300', text: 'Low' }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      research: 'bg-purple-500/20 text-purple-300',
      market_data: 'bg-blue-500/20 text-blue-300',
      social: 'bg-pink-500/20 text-pink-300',
      utility: 'bg-cyan-500/20 text-cyan-300',
      other: 'bg-white/10 text-white/60',
    }
    return colors[category] || colors.other
  }

  return (
    <div className="w-full max-w-2xl my-2 p-6 rounded-xl border border-indigo-500/30 bg-linear-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-md shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest opacity-70 font-semibold mb-1 flex items-center gap-1">
            <Globe className="w-3 h-3" /> Agent Directory
          </div>
          <div className="text-2xl font-black tracking-tight">📚 {totalAgents} Agents Found</div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest opacity-70 font-semibold mb-1">
            Endpoints
          </div>
          <div className="text-xl font-bold">{totalEndpoints}</div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
          <Server className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
          <div className="text-lg font-bold">{agentsWithEndpoints}</div>
          <div className="text-[10px] uppercase opacity-60">With Endpoints</div>
        </div>
        <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
          <DollarSign className="w-4 h-4 mx-auto mb-1 text-green-400" />
          <div className="text-lg font-bold">
            {agents.filter((a) => a.avgPriceUsdc).length > 0
              ? `$${(agents.filter((a) => a.avgPriceUsdc).reduce((sum, a) => sum + (a.avgPriceUsdc || 0), 0) / agents.filter((a) => a.avgPriceUsdc).length).toFixed(4)}`
              : 'N/A'}
          </div>
          <div className="text-[10px] uppercase opacity-60">Avg Price</div>
        </div>
        <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
          <BarChart3 className="w-4 h-4 mx-auto mb-1 text-amber-400" />
          <div className="text-lg font-bold">
            {agents.filter((a) => a.avgQualityScore).length > 0
              ? Math.round(
                  agents
                    .filter((a) => a.avgQualityScore)
                    .reduce((sum, a) => sum + (a.avgQualityScore || 0), 0) /
                    agents.filter((a) => a.avgQualityScore).length
                )
              : 'N/A'}
          </div>
          <div className="text-[10px] uppercase opacity-60">Avg Quality</div>
        </div>
      </div>

      {/* Agent List */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
        {agents.slice(0, 10).map((agent: any) => (
          <div
            key={agent.ghostAddress}
            className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <code className="text-sm font-mono text-white/80">{agent.shortAddress}</code>
                <div className="text-[10px] uppercase opacity-50 mt-0.5">{agent.status}</div>
              </div>
              <div className="flex items-center gap-2">
                {agent.totalEndpoints > 0 && (
                  <span className="flex items-center gap-1 text-xs text-indigo-300">
                    <Zap className="w-3 h-3" />
                    {agent.totalEndpoints}
                  </span>
                )}
                {agent.avgQualityScore && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium ${getQualityBadge(agent.avgQualityScore).color}`}
                  >
                    {agent.avgQualityScore}%
                  </span>
                )}
              </div>
            </div>

            {/* Categories */}
            {agent.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {agent.categories.map((cat: any) => (
                  <span
                    key={cat}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium ${getCategoryColor(cat)}`}
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}

            {/* Endpoints List */}
            {agent.endpoints.length > 0 && (
              <div className="mt-2 space-y-1 border-t border-white/5 pt-2">
                {agent.endpoints.map((ep: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-[10px] bg-black/20 px-2 py-1.5 rounded group/ep hover:bg-black/40 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          ep.category === 'research'
                            ? 'bg-purple-400'
                            : ep.category === 'market_data'
                              ? 'bg-blue-400'
                              : ep.category === 'social'
                                ? 'bg-pink-400'
                                : 'bg-gray-400'
                        }`}
                      />
                      <span className="font-mono opacity-80 truncate" title={ep.endpoint}>
                        {ep.endpoint.replace('https://', '')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 opacity-60 font-mono pl-2">
                      <span className="text-[9px] uppercase">{ep.method}</span>
                      <span className="text-green-300/80">${ep.priceUsdc}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            {onActionClick && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => onActionClick(agent.ghostScorePrompt)}
                  className="flex-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-white/70 hover:text-white hover:bg-white/10 transition-all"
                >
                  Ghost Score
                </button>
                <button
                  onClick={() => onActionClick(agent.vibeCheckPrompt)}
                  className="flex-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-white/70 hover:text-white hover:bg-white/10 transition-all"
                >
                  Vibe Check
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      {agents.length > 10 && (
        <div className="mt-4 text-center text-xs text-white/40">
          Showing 10 of {agents.length} agents
        </div>
      )}

      <div className="p-0.5 rounded-xl bg-linear-to-br from-indigo-900 to-purple-900 bg-opacity-20">
        <div className="mt-4 pt-4 border-t border-current border-opacity-20 text-[10px] opacity-40 font-mono">
          GHOST PROTOCOL v1.0 | AGENT DIRECTORY
        </div>
      </div>
    </div>
  )
}
