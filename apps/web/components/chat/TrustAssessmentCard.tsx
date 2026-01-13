/**
 * Trust Assessment Card Component
 *
 * Displays trust assessment results with green/yellow/red flags
 */

import { CheckCircle, AlertCircle, XCircle, Shield, BarChart, FileCheck } from 'lucide-react'

interface TrustAssessmentCardProps {
  agentAddress: string
  greenFlags: string[]
  yellowFlags: string[]
  redFlags: string[]
  scoreData?: {
    score: number
    tier: string
  }
  onActionClick?: (prompt: string) => void
}

export function TrustAssessmentCard({
  agentAddress,
  greenFlags,
  yellowFlags,
  redFlags,
  scoreData,
  onActionClick,
}: TrustAssessmentCardProps) {
  // Determine overall verdict color
  const getVerdictColor = () => {
    if (redFlags.length >= 2) return 'border-red-500/30 from-red-900/40 to-red-950/40'
    if (redFlags.length === 1) return 'border-orange-500/30 from-orange-900/40 to-red-900/40'
    if (greenFlags.length >= 2 && redFlags.length === 0)
      return 'border-emerald-500/30 from-emerald-900/40 to-green-900/40'
    return 'border-amber-500/30 from-amber-900/40 to-yellow-900/40'
  }

  const getVerdictText = () => {
    if (redFlags.length >= 2) return { text: 'High Risk', emoji: '🚩' }
    if (redFlags.length === 1) return { text: 'Caution', emoji: '⚠️' }
    if (greenFlags.length >= 2 && redFlags.length === 0) return { text: 'Trusted', emoji: '✅' }
    return { text: 'Neutral', emoji: '🔍' }
  }

  const verdict = getVerdictText()
  const themeClass = getVerdictColor()

  return (
    <div
      className={`w-full max-w-md my-2 p-6 rounded-xl border bg-linear-to-br backdrop-blur-md shadow-xl ${themeClass}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest opacity-70 font-semibold mb-1 flex items-center gap-1">
            <Shield className="w-3 h-3" /> Trust Assessment
          </div>
          <div className="text-2xl font-black tracking-tight">
            {verdict.emoji} {verdict.text}
          </div>
        </div>
        {scoreData && (
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest opacity-70 font-semibold mb-1">
              Ghost Score
            </div>
            <div className="text-xl font-bold tracking-wide">
              {scoreData.score.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Agent Address */}
      <div className="mb-4 text-xs font-mono opacity-60">
        {agentAddress.slice(0, 8)}...{agentAddress.slice(-4)}
      </div>

      {/* Flags */}
      <div className="space-y-4">
        {/* Green Flags */}
        {greenFlags.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-widest text-emerald-400 font-semibold mb-2 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Green Flags
            </div>
            <ul className="space-y-1">
              {greenFlags.map((flag: any, i: number) => (
                <li key={i} className="text-sm text-emerald-300/90 flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">•</span>
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Yellow Flags */}
        {yellowFlags.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-widest text-amber-400 font-semibold mb-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Yellow Flags
            </div>
            <ul className="space-y-1">
              {yellowFlags.map((flag: any, i: number) => (
                <li key={i} className="text-sm text-amber-300/90 flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">•</span>
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Red Flags */}
        {redFlags.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-widest text-red-400 font-semibold mb-2 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Red Flags
            </div>
            <ul className="space-y-1">
              {redFlags.map((flag: any, i: number) => (
                <li key={i} className="text-sm text-red-300/90 flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {onActionClick && (
        <div className="mt-4 pt-4 border-t border-current border-opacity-20 flex gap-2">
          <button
            onClick={() => onActionClick(`Ghost score for ${agentAddress}`)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all"
          >
            <BarChart className="w-3 h-3" />
            Ghost Score
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

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-current border-opacity-20 text-[10px] opacity-40 font-mono">
        GHOST PROTOCOL v1.0 | TRUST ASSESSMENT
      </div>
    </div>
  )
}
