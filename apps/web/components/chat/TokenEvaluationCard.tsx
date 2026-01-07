/**
 * Token Evaluation Card Component
 *
 * Displays agent token portfolio analysis, highlighting risks and exploitation scores
 */

import { Wallet, AlertTriangle, CheckCircle } from 'lucide-react'
import { useState } from 'react'

interface Token {
  mint: string
  symbol: string
  amount: number
  valueUsd: number
  safetyScore: number
  flags: {
    red: string[]
    yellow: string[]
    green: string[]
  }
  isVerified: boolean
}

interface TokenEvaluationCardProps {
  agentAddress: string
  totalValue: number
  tokenCount: number
  verifiedCount: number
  riskyCount: number
  avgExploitScore: number
  tokens: Token[]
  onActionClick?: (prompt: string) => void
}

export function TokenEvaluationCard({
  agentAddress,
  totalValue,
  tokenCount,
  verifiedCount,
  riskyCount,
  avgExploitScore,
  tokens,
  onActionClick: _onActionClick, // Renamed to indicate unused
}: TokenEvaluationCardProps) {
  const [expanded, setExpanded] = useState(false)

  // Risk Level
  const getRiskLevel = () => {
    if (avgExploitScore > 70)
      return {
        label: 'High Risk',
        color: 'text-red-400',
        border: 'border-red-500/30',
        bg: 'from-red-900/40 to-red-950/40',
      }
    if (avgExploitScore > 40)
      return {
        label: 'Moderate Risk',
        color: 'text-amber-400',
        border: 'border-amber-500/30',
        bg: 'from-amber-900/40 to-yellow-900/40',
      }
    return {
      label: 'Clean Portfolio',
      color: 'text-emerald-400',
      border: 'border-emerald-500/30',
      bg: 'from-emerald-900/40 to-green-900/40',
    }
  }

  const risk = getRiskLevel()

  return (
    <div
      className={`w-full max-w-md my-2 p-6 rounded-xl border bg-linear-to-br backdrop-blur-md shadow-xl ${risk.border} ${risk.bg}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div
            className={`text-xs uppercase tracking-widest opacity-80 font-bold mb-1 flex items-center gap-1 ${risk.color}`}
          >
            <Wallet className="w-3 h-3" /> Token Portfolio
          </div>
          <div className="text-2xl font-black tracking-tight flex items-center gap-2">
            ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            <span className="text-sm font-normal opacity-50 relative top-0.5">USD</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest opacity-70 font-semibold mb-1">
            Exploitation Risk
          </div>
          <div className={`text-xl font-bold tracking-wide ${risk.color}`}>
            {avgExploitScore.toFixed(0)}/100
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="p-3 rounded-lg bg-black/20 border border-white/5">
          <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">Tokens</div>
          <div className="text-lg font-bold">{tokenCount}</div>
        </div>
        <div className="p-3 rounded-lg bg-black/20 border border-white/5">
          <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">Verified</div>
          <div className="text-lg font-bold text-emerald-400">{verifiedCount}</div>
        </div>
        <div className="p-3 rounded-lg bg-black/20 border border-white/5">
          <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">Risky</div>
          <div className={`text-lg font-bold ${riskyCount > 0 ? 'text-red-400' : 'text-white/60'}`}>
            {riskyCount}
          </div>
        </div>
      </div>

      {/* Token List */}
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-widest opacity-60 font-semibold flex justify-between">
          <span>Top Assets</span>
          <span>Risk Score</span>
        </div>

        {(expanded ? tokens : tokens.slice(0, 3)).map((token) => (
          <div
            key={token.mint}
            className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold">{token.symbol}</span>
                {token.isVerified && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                {!token.isVerified && <AlertTriangle className="w-3 h-3 text-amber-400" />}
              </div>
              <div className="text-right">
                <div className="text-sm font-mono">
                  ${token.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-1">
              {token.flags.red.map((flag, i) => (
                <span
                  key={`r-${i}`}
                  className="px-1.5 py-0.5 rounded bg-red-500/20 text-[10px] text-red-300 border border-red-500/20"
                >
                  {flag}
                </span>
              ))}
              {token.flags.yellow.map((flag, i) => (
                <span
                  key={`y-${i}`}
                  className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px] text-amber-300 border border-amber-500/20"
                >
                  {flag}
                </span>
              ))}
              {token.flags.red.length === 0 && token.flags.yellow.length === 0 && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] text-emerald-300 border border-emerald-500/20">
                  Safe
                </span>
              )}
            </div>
          </div>
        ))}

        {tokens.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-center text-xs opacity-50 hover:opacity-100 py-2 border-t border-white/10 mt-2"
          >
            {expanded ? 'Show Less' : `Show ${tokens.length - 3} More Tokens`}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-current border-opacity-20 text-[10px] opacity-40 font-mono flex justify-between">
        <span>JUPITER ULTRA ANALYSIS</span>
        <span>
          {agentAddress.slice(0, 4)}...{agentAddress.slice(-4)}
        </span>
      </div>
    </div>
  )
}
