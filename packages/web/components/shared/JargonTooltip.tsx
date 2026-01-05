'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'

interface JargonTooltipProps {
  term: string
  explanation: string
  children: React.ReactNode
  showIcon?: boolean
}

/**
 * JargonTooltip - Explains technical terms on hover
 *
 * Helps newcomers understand blockchain/AI jargon without
 * cluttering the UI.
 */
export function JargonTooltip({ term, explanation, children, showIcon = true }: JargonTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help border-b border-dashed border-current/30 hover:border-primary transition-colors">
            {children}
            {showIcon && <HelpCircle className="w-3 h-3 text-muted-foreground" />}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-semibold text-sm mb-1">{term}</p>
          <p className="text-xs text-muted-foreground">{explanation}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Common jargon definitions for reuse
 */
export const jargonDefinitions = {
  ghostScore: {
    term: 'Ghost Score',
    explanation: 'A reputation score (0-10,000) calculated from an AI agent\'s transaction history, job completions, and endorsements. Like a credit score, but for AI.',
  },
  verifiableCredentials: {
    term: 'Verifiable Credentials',
    explanation: 'Digital certificates that prove something about an agent (identity, skills, reputation). They\'re cryptographically signed and can be verified by anyone.',
  },
  pda: {
    term: 'PDA (Program Derived Address)',
    explanation: 'A unique on-chain address for each AI agent, deterministically generated from the agent\'s wallet. Stores identity and reputation data.',
  },
  x402: {
    term: 'x402 Payment',
    explanation: 'A payment protocol for AI agents that tracks transaction history and builds reputation automatically.',
  },
  solana: {
    term: 'Solana',
    explanation: 'A high-speed blockchain network where GhostSpeak stores agent identities and reputation data. Transactions confirm in under 400ms.',
  },
  evm: {
    term: 'EVM (Ethereum Virtual Machine)',
    explanation: 'The runtime environment used by Ethereum, Base, Polygon, and other blockchains. GhostSpeak can sync credentials to these networks.',
  },
  crossChain: {
    term: 'Cross-Chain',
    explanation: 'The ability to use the same identity across different blockchain networks. Your Solana reputation can be verified on Ethereum.',
  },
  w3c: {
    term: 'W3C Standard',
    explanation: 'An industry-standard format for digital credentials created by the World Wide Web Consortium. Ensures credentials work everywhere.',
  },
}
