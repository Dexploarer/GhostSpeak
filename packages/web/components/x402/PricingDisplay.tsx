/**
 * x402 Pricing Display Component
 *
 * Shows agent pricing with token information
 */

'use client'

import React from 'react'
import { DollarSign, Clock, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { AgentPricing } from '@/lib/ghostspeak'

interface PricingDisplayProps {
  pricing: AgentPricing
  showDetails?: boolean
  className?: string
}

export function PricingDisplay({
  pricing,
  showDetails = false,
  className = '',
}: PricingDisplayProps): React.JSX.Element {
  const pricePerCall = Number(pricing.pricePerCall) / 1e9 // Convert lamports to SOL
  const hasResponseTime = pricing.responseTimeMs && pricing.responseTimeMs > 0

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Price */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-cyan-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Per Call</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold gradient-text">{pricePerCall.toFixed(6)}</span>
          <span className="text-sm text-gray-500">SOL</span>
        </div>
      </div>

      {showDetails && (
        <>
          {/* Response Time */}
          {hasResponseTime && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>Avg Response</span>
              </div>
              <Badge variant="outline" className="gap-1">
                <Zap className="w-3 h-3" />
                {pricing.responseTimeMs}ms
              </Badge>
            </div>
          )}

          {/* Payment Token */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payment Token</div>
            <div className="font-mono text-xs p-2 rounded bg-gray-100 dark:bg-gray-800 truncate">
              {pricing.paymentToken}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface PricingComparisonProps {
  agents: Array<{
    address: string
    name: string
    pricing: AgentPricing
  }>
  highlightAddress?: string
}

export function PricingComparison({
  agents,
  highlightAddress,
}: PricingComparisonProps): React.JSX.Element {
  const sortedAgents = [...agents].sort((a, b) => {
    const priceA = Number(a.pricing.pricePerCall)
    const priceB = Number(b.pricing.pricePerCall)
    return priceA - priceB
  })

  const prices = sortedAgents.map((a) => Number(a.pricing.pricePerCall) / 1e9)
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Lowest</div>
          <div className="font-bold gradient-text">{Math.min(...prices).toFixed(6)}</div>
        </div>
        <div className="glass rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Average</div>
          <div className="font-bold gradient-text">{avgPrice.toFixed(6)}</div>
        </div>
        <div className="glass rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Highest</div>
          <div className="font-bold gradient-text">{Math.max(...prices).toFixed(6)}</div>
        </div>
      </div>

      {/* Agent List */}
      <div className="space-y-2">
        {sortedAgents.map((agent, index) => {
          const price = Number(agent.pricing.pricePerCall) / 1e9
          const isHighlighted = agent.address === highlightAddress
          const percentDiff = avgPrice > 0 ? ((price - avgPrice) / avgPrice) * 100 : 0

          return (
            <div
              key={agent.address}
              className={`
                glass rounded-lg p-3 flex items-center justify-between
                ${isHighlighted ? 'ring-2 ring-cyan-500' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium">{agent.name}</div>
                  {agent.pricing.responseTimeMs && agent.pricing.responseTimeMs > 0 && (
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {agent.pricing.responseTimeMs}ms
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">{price.toFixed(6)} SOL</div>
                {Math.abs(percentDiff) > 1 && (
                  <div
                    className={`text-xs ${
                      percentDiff < 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {percentDiff > 0 ? '+' : ''}
                    {percentDiff.toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
