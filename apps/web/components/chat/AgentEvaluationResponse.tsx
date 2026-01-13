import { BadgeDefinition, BADGE_DEFINITIONS } from '@/lib/badges/definitions'
import { BadgeDetailsModal } from '@/components/shared/BadgeDetailsModal'
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Shield, Search, FileCheck } from 'lucide-react'

interface AgentEvaluationResponseProps {
  agentAddress?: string
  score: number
  tier: string
  breakdown: Record<string, { score: number; dataPoints: number }> // Simplified type
  network?: { chain: string; environment: string }
  myTake?: string
  badges?: string[] // Badge IDs
  onActionClick?: (prompt: string) => void
}

export function AgentEvaluationResponse({
  agentAddress,
  score,
  tier,
  breakdown,
  network,
  myTake,
  badges = [],
  onActionClick,
}: AgentEvaluationResponseProps) {
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null)

  // Map badge IDs to full definitions
  const activeBadges = badges.map((id: any) => BADGE_DEFINITIONS[id]).filter(Boolean)

  // Determine color theme based on tier
  const getThemeColor = (t: string) => {
    switch (t) {
      case 'PLATINUM':
      case 'DIAMOND':
        return 'text-cyan-400 border-cyan-400/30 from-cyan-900/40 to-blue-900/40'
      case 'GOLD':
        return 'text-amber-400 border-amber-400/30 from-amber-900/40 to-yellow-900/40'
      case 'SILVER':
        return 'text-slate-300 border-slate-400/30 from-slate-800/40 to-gray-800/40'
      case 'BRONZE':
        return 'text-orange-300 border-orange-400/30 from-orange-900/40 to-red-900/40'
      default:
        return 'text-emerald-400 border-emerald-400/30 from-emerald-900/40 to-green-900/40'
    }
  }

  const themeClass = getThemeColor(tier)
  const isZeroScore = score === 0

  return (
    <>
      <div
        className={`w-full max-w-md my-2 p-6 rounded-xl border bg-linear-to-br backdrop-blur-md shadow-xl ${themeClass}`}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-70 font-semibold mb-1">
              Ghost Score
            </div>
            <div
              className="text-4xl font-black tracking-tight"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {score.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest opacity-70 font-semibold mb-1">
              Tier status
            </div>
            <div className="text-xl font-bold tracking-wide">{tier}</div>
          </div>
        </div>

        {/* Badges Section */}
        {activeBadges.length > 0 && (
          <div className="mb-6">
            <div className="text-xs uppercase tracking-widest opacity-50 font-semibold mb-3 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Credentials & Badges
            </div>
            <div className="flex flex-wrap gap-2">
              {activeBadges.map((badge: any) => {
                const Icon = badge.icon
                const isLegendary = badge.rarity === 'LEGENDARY'
                return (
                  <button
                    key={badge.id}
                    onClick={() => setSelectedBadge(badge)}
                    className={`
                      group relative p-2 rounded-lg border transition-all duration-200
                      ${isLegendary ? 'bg-amber-400/20 border-amber-400/50 hover:bg-amber-400/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}
                    `}
                    title={badge.name}
                  >
                    <Icon
                      className={`w-5 h-5 ${isLegendary ? 'text-amber-300' : 'text-white/70 group-hover:text-white'}`}
                    />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Breakdown Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-2 rounded bg-black/20 border border-white/5">
            <div className="text-[10px] uppercase opacity-50">On-Chain Activity</div>
            <div className="font-mono">{breakdown.onChainActivity?.score ?? 0} pts</div>
          </div>
          <div className="p-2 rounded bg-black/20 border border-white/5">
            <div className="text-[10px] uppercase opacity-50">Identity</div>
            <div className="font-mono">{breakdown.credentialVerifications?.score ?? 0} pts</div>
          </div>
          <div className="p-2 rounded bg-black/20 border border-white/5">
            <div className="text-[10px] uppercase opacity-50">Payments</div>
            <div className="font-mono">{breakdown.paymentActivity?.score ?? 0} pts</div>
          </div>
          <div className="p-2 rounded bg-black/20 border border-white/5">
            <div className="text-[10px] uppercase opacity-50">Staking</div>
            <div className="font-mono">{breakdown.stakingCommitment?.score ?? 0} pts</div>
          </div>
        </div>

        {/* Footer / Vibe Check */}
        {myTake && (
          <div className="mt-6 pt-4 border-t border-current border-opacity-20">
            <div className="text-xs italic opacity-80 leading-relaxed font-medium">"{myTake}"</div>
          </div>
        )}

        {/* Network Info */}
        {(network || isZeroScore) && (
          <div className="mt-4 flex justify-between items-center text-[10px] opacity-40 font-mono">
            <span>{network?.environment || 'DEVNET'}</span>
            <span>GHOST PROTOCOL v1.0</span>
          </div>
        )}

        {/* Action Buttons */}
        {agentAddress && onActionClick && (
          <div className="mt-4 pt-4 border-t border-current border-opacity-20 flex gap-2">
            <button
              onClick={() => onActionClick(`Vibe check ${agentAddress}`)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              <Search className="w-3 h-3" />
              Vibe Check
            </button>
            <button
              onClick={() => onActionClick(`What credentials does ${agentAddress} have?`)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              <FileCheck className="w-3 h-3" />
              Credentials
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedBadge && (
          <BadgeDetailsModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
        )}
      </AnimatePresence>
    </>
  )
}
